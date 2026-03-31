use crate::errors::MyError;
use crate::models::moments::{
    CreateMoment, Moment, normalize_moment_author, normalize_moment_content,
    normalize_moment_images,
};
use chrono::Utc;
use sqlx::postgres::PgPool;

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

    Ok(())
}

pub async fn list_moments_db(pool: &PgPool) -> Result<Vec<Moment>, MyError> {
    let rows = sqlx::query_as::<_, Moment>(
        r#"
        SELECT *
        FROM moments
        ORDER BY created_at DESC NULLS LAST, id DESC
        "#,
    )
    .fetch_all(pool)
    .await?;

    Ok(rows)
}

pub async fn create_moment_db(pool: &PgPool, payload: CreateMoment) -> Result<Moment, MyError> {
    let author = normalize_moment_author(&payload.author);
    let content = normalize_moment_content(&payload.content);
    let images = normalize_moment_images(&payload.images)?;

    if content.is_empty() && images.is_empty() {
        return Err(MyError::BadRequest(
            "content or images is required".into(),
        ));
    }

    let now = Utc::now().naive_utc();

    let row = sqlx::query_as::<_, Moment>(
        r#"
        INSERT INTO moments (author, content, images, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $4)
        RETURNING *
        "#,
    )
    .bind(author)
    .bind(content)
    .bind(images)
    .bind(now)
    .fetch_one(pool)
    .await?;

    Ok(row)
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
