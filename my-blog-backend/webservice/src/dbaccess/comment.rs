use crate::errors::MyError;
use crate::models::comments::{Comment, CreateComment};
use chrono::Utc;
use sqlx::postgres::PgPool;

pub async fn get_comment_by_id_db(pool: &PgPool, article_id: i32) -> Result<Comment, MyError> {
    let row = sqlx::query_as::<_, Comment>(r#"select * from comments where article_id = $1"#)
        .bind(article_id)
        .fetch_one(pool)
        .await?;
    Ok(row)
}

pub async fn delete_comment_by_id_db(pool: &PgPool, article_id: i32) -> Result<String, MyError> {
    let row = sqlx::query("delete from comments where article_id = $1")
        .bind(article_id)
        .execute(pool)
        .await?;
    Ok(format!("Deleted {:?} record", row))
}

pub async fn post_new_comment_db(
    pool: &PgPool,
    createcomment: CreateComment,
) -> Result<Comment, MyError> {
    let now = Utc::now().naive_utc();
    let new_article_now = sqlx::query_as::<_, Comment>(
        r#"insert into comments (article_id, author, content, date)
        values ($1, $2, $3, $4)returning *"#,
    )
    .bind(createcomment.article_id)
    .bind(createcomment.author)
    .bind(createcomment.content)
    .bind(now)
    .fetch_one(pool)
    .await?;

    Ok(new_article_now)
}
