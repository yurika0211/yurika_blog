use crate::errors::MyError;
use crate::models::moments::{
    CreateMoment, CreateMomentComment, Moment, MomentComment, MomentLikeState, MomentRow,
    normalize_moment_author, normalize_moment_comment_author, normalize_moment_comment_content,
    normalize_moment_content, normalize_moment_images,
};
use chrono::Utc;
use sqlx::FromRow;
use sqlx::postgres::PgPool;
use std::collections::HashMap;

#[derive(Debug, FromRow)]
struct MomentLikeAggregate {
    moment_id: i32,
    likes_count: i64,
    liked_by_device: bool,
}

pub async fn ensure_moments_schema_db(pool: &PgPool) -> Result<(), MyError> {
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS moments (
            id SERIAL PRIMARY KEY,
            author VARCHAR(255) NOT NULL,
            content TEXT NOT NULL DEFAULT '',
            images TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS moment_comments (
            id SERIAL PRIMARY KEY,
            moment_id INTEGER NOT NULL REFERENCES moments(id) ON DELETE CASCADE,
            author VARCHAR(255) NOT NULL,
            content TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS moment_likes (
            id SERIAL PRIMARY KEY,
            moment_id INTEGER NOT NULL REFERENCES moments(id) ON DELETE CASCADE,
            device_id VARCHAR(128) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(moment_id, device_id)
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE INDEX IF NOT EXISTS idx_moment_comments_moment_created_at
        ON moment_comments(moment_id, created_at DESC, id DESC)
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE INDEX IF NOT EXISTS idx_moment_likes_moment_id
        ON moment_likes(moment_id)
        "#,
    )
    .execute(pool)
    .await?;

    Ok(())
}

fn build_moment(
    row: MomentRow,
    comments: Vec<MomentComment>,
    like_state: Option<(i64, bool)>,
) -> Moment {
    let (likes_count, liked_by_device) = like_state.unwrap_or((0, false));

    Moment {
        id: row.id,
        author: row.author,
        content: row.content,
        images: row.images,
        created_at: row.created_at,
        updated_at: row.updated_at,
        likes_count,
        comments_count: comments.len() as i64,
        liked_by_device,
        comments,
    }
}

async fn ensure_moment_exists_db(pool: &PgPool, moment_id: i32) -> Result<(), MyError> {
    let exists =
        sqlx::query_scalar::<_, bool>("SELECT EXISTS(SELECT 1 FROM moments WHERE id = $1)")
            .bind(moment_id)
            .fetch_one(pool)
            .await?;

    if exists {
        return Ok(());
    }

    Err(MyError::NotFound("Moment not found".into()))
}

async fn get_moment_like_state_db(
    pool: &PgPool,
    moment_id: i32,
    device_id: &str,
) -> Result<MomentLikeState, MyError> {
    let aggregate = sqlx::query_as::<_, MomentLikeAggregate>(
        r#"
        SELECT
            $1::INTEGER AS moment_id,
            COUNT(*)::BIGINT AS likes_count,
            COALESCE(BOOL_OR(device_id = $2), FALSE) AS liked_by_device
        FROM moment_likes
        WHERE moment_id = $1
        "#,
    )
    .bind(moment_id)
    .bind(device_id)
    .fetch_one(pool)
    .await?;

    Ok(MomentLikeState {
        moment_id: aggregate.moment_id,
        likes_count: aggregate.likes_count,
        liked_by_device: aggregate.liked_by_device,
    })
}

pub async fn list_moments_db(
    pool: &PgPool,
    device_id: Option<&str>,
) -> Result<Vec<Moment>, MyError> {
    let rows = sqlx::query_as::<_, MomentRow>(
        r#"
        SELECT id, author, content, images, created_at, updated_at
        FROM moments
        ORDER BY created_at DESC NULLS LAST, id DESC
        "#,
    )
    .fetch_all(pool)
    .await?;

    if rows.is_empty() {
        return Ok(vec![]);
    }

    let moment_ids = rows.iter().map(|item| item.id).collect::<Vec<_>>();
    let comments = sqlx::query_as::<_, MomentComment>(
        r#"
        SELECT id, moment_id, author, content, created_at
        FROM moment_comments
        WHERE moment_id = ANY($1)
        ORDER BY created_at ASC NULLS LAST, id ASC
        "#,
    )
    .bind(&moment_ids)
    .fetch_all(pool)
    .await?;

    let like_rows = if let Some(current_device_id) = device_id {
        sqlx::query_as::<_, MomentLikeAggregate>(
            r#"
            SELECT
                moment_id,
                COUNT(*)::BIGINT AS likes_count,
                COALESCE(BOOL_OR(device_id = $2), FALSE) AS liked_by_device
            FROM moment_likes
            WHERE moment_id = ANY($1)
            GROUP BY moment_id
            "#,
        )
        .bind(&moment_ids)
        .bind(current_device_id)
        .fetch_all(pool)
        .await?
    } else {
        sqlx::query_as::<_, MomentLikeAggregate>(
            r#"
            SELECT
                moment_id,
                COUNT(*)::BIGINT AS likes_count,
                FALSE AS liked_by_device
            FROM moment_likes
            WHERE moment_id = ANY($1)
            GROUP BY moment_id
            "#,
        )
        .bind(&moment_ids)
        .fetch_all(pool)
        .await?
    };

    let mut comments_by_moment = comments.into_iter().fold(
        HashMap::<i32, Vec<MomentComment>>::new(),
        |mut acc, comment| {
            acc.entry(comment.moment_id).or_default().push(comment);
            acc
        },
    );

    let likes_by_moment = like_rows
        .into_iter()
        .map(|item| (item.moment_id, (item.likes_count, item.liked_by_device)))
        .collect::<HashMap<_, _>>();

    let moments = rows
        .into_iter()
        .map(|row| {
            let comments = comments_by_moment.remove(&row.id).unwrap_or_default();
            let like_state = likes_by_moment.get(&row.id).copied();
            build_moment(row, comments, like_state)
        })
        .collect::<Vec<_>>();

    Ok(moments)
}

pub async fn create_moment_db(pool: &PgPool, payload: CreateMoment) -> Result<Moment, MyError> {
    let author = normalize_moment_author(&payload.author);
    let content = normalize_moment_content(&payload.content);
    let images = normalize_moment_images(&payload.images)?;

    if content.is_empty() && images.is_empty() {
        return Err(MyError::BadRequest("content or images is required".into()));
    }

    let now = Utc::now().naive_utc();

    let row = sqlx::query_as::<_, MomentRow>(
        r#"
        INSERT INTO moments (author, content, images, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $4)
        RETURNING id, author, content, images, created_at, updated_at
        "#,
    )
    .bind(author)
    .bind(content)
    .bind(images)
    .bind(now)
    .fetch_one(pool)
    .await?;

    Ok(build_moment(row, vec![], Some((0, false))))
}

pub async fn delete_moment_db(pool: &PgPool, moment_id: i32) -> Result<String, MyError> {
    let row = sqlx::query("DELETE FROM moments WHERE id = $1")
        .bind(moment_id)
        .execute(pool)
        .await?;

    if row.rows_affected() == 0 {
        return Err(MyError::NotFound("Moment not found".into()));
    }

    Ok("Moment deleted".into())
}

pub async fn create_moment_comment_db(
    pool: &PgPool,
    moment_id: i32,
    payload: CreateMomentComment,
) -> Result<MomentComment, MyError> {
    ensure_moment_exists_db(pool, moment_id).await?;

    let author = normalize_moment_comment_author(&payload.author);
    let content = normalize_moment_comment_content(&payload.content)?;
    let now = Utc::now().naive_utc();

    let row = sqlx::query_as::<_, MomentComment>(
        r#"
        INSERT INTO moment_comments (moment_id, author, content, created_at)
        VALUES ($1, $2, $3, $4)
        RETURNING id, moment_id, author, content, created_at
        "#,
    )
    .bind(moment_id)
    .bind(author)
    .bind(content)
    .bind(now)
    .fetch_one(pool)
    .await?;

    Ok(row)
}

pub async fn delete_moment_comment_db(
    pool: &PgPool,
    moment_id: i32,
    comment_id: i32,
) -> Result<String, MyError> {
    let row = sqlx::query("DELETE FROM moment_comments WHERE moment_id = $1 AND id = $2")
        .bind(moment_id)
        .bind(comment_id)
        .execute(pool)
        .await?;

    if row.rows_affected() == 0 {
        return Err(MyError::NotFound("Moment comment not found".into()));
    }

    Ok("Moment comment deleted".into())
}

pub async fn like_moment_db(
    pool: &PgPool,
    moment_id: i32,
    device_id: &str,
) -> Result<MomentLikeState, MyError> {
    ensure_moment_exists_db(pool, moment_id).await?;

    sqlx::query(
        r#"
        INSERT INTO moment_likes (moment_id, device_id)
        VALUES ($1, $2)
        ON CONFLICT (moment_id, device_id) DO NOTHING
        "#,
    )
    .bind(moment_id)
    .bind(device_id)
    .execute(pool)
    .await?;

    get_moment_like_state_db(pool, moment_id, device_id).await
}

pub async fn unlike_moment_db(
    pool: &PgPool,
    moment_id: i32,
    device_id: &str,
) -> Result<MomentLikeState, MyError> {
    ensure_moment_exists_db(pool, moment_id).await?;

    sqlx::query("DELETE FROM moment_likes WHERE moment_id = $1 AND device_id = $2")
        .bind(moment_id)
        .bind(device_id)
        .execute(pool)
        .await?;

    get_moment_like_state_db(pool, moment_id, device_id).await
}
