use crate::errors::MyError;
use crate::models::articles::{Article, CreateArticle, UpdateArticle};
use sqlx::postgres::PgPool;

use chrono::Utc;

/**
 * get all articles from the database
 * @param pool
 * @return Result<Vec<Article>, MyError>
 */
pub async fn get_all_notes_db(pool: &PgPool) -> Result<Vec<Article>, MyError> {
    let rows = sqlx::query_as::<_, Article>(r#"SELECT * FROM articles"#)
        .fetch_all(pool)
        .await?;
    Ok(rows)
}

/**
 * get a single article by id from the database
 * @param pool
 * @param article_id
 * @return Result<Article, MyError>
 */
pub async fn get_article_by_id_db(pool: &PgPool, article_id: i32) -> Result<Article, MyError> {
    let row = sqlx::query_as::<_, Article>(r#"SELECT * FROM articles where id = $1"#)
        .bind(article_id)
        .fetch_one(pool)
        .await?;
    Ok(row)
}

// 更新数据库当中指定文章
pub async fn update_article_by_id_db(
    pool: &PgPool,
    article_id: i32,
    update_article: UpdateArticle,
) -> Result<Article, MyError> {
    let current_article_row = sqlx::query_as::<_, Article>("select * from articles where id = $1")
        .bind(article_id)
        .fetch_one(pool)
        .await
        .map_err(|_err| MyError::NotFound("Article Id not found".into()))?;

    let title: String = if let Some(title) = update_article.title {
        title
    } else {
        current_article_row.title
    };

    let content: String = if let Some(content) = update_article.content {
        content
    } else {
        current_article_row.content.unwrap_or_default()
    };

    let summary: String = if let Some(summary) = update_article.summary {
        summary
    } else {
        current_article_row.summary.unwrap_or_default()
    };

    let tags: Vec<String> = if let Some(tags) = update_article.tags {
        tags
    } else {
        current_article_row.tags.unwrap_or_default()
    };

    let updated_article_row = sqlx::query_as::<_, Article>(
        r#"UPDATE articles SET title = $1, content = $2, summary = $3, tags = $4 WHERE id = $5 RETURNING *"#,
    )
    .bind(title)
    .bind(content)
    .bind(summary)
    .bind(tags)
    .bind(article_id)
    .fetch_one(pool)
    .await?;

    Ok(updated_article_row)
}

// 删除数据库当中指定文章
pub async fn delete_article_by_id_db(pool: &PgPool, article_id: i32) -> Result<String, MyError> {
    let row = sqlx::query("DELETE FROM articles WHERE id = $1")
        .bind(article_id)
        .execute(pool)
        .await?;

    Ok(format!("Deleted {:?} record", row))
}

// 创建数据库当中指定文章
pub async fn create_article_db(
    pool: &PgPool,
    create_article: CreateArticle,
) -> Result<Article, MyError> {
    let now = Utc::now().naive_utc();
    let new_article_row = sqlx::query_as::<_, Article>(
        r#"INSERT INTO articles (title, content, summary, tags, date) VALUES ($1, $2, $3, $4, $5) RETURNING *"#,
    )
    .bind(create_article.title)
    .bind(create_article.content)
    .bind(create_article.summary)
    .bind(create_article.tags)
    .bind(now)
    .fetch_one(pool)
    .await?;

    Ok(new_article_row)
}
