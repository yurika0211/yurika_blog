use crate::errors::MyError;
use crate::models::articles::{
    Article, CreateArticle, PaginatedArticles, PaginationParams, UpdateArticle,
};
use sqlx::postgres::PgPool;

use chrono::Utc;

/**
 * get all articles from the database
 * @param pool
 * @return Result<Vec<Article>, MyError>
 */
pub async fn get_all_notes_db(
    pool: &PgPool,
    include_login_required: bool,
) -> Result<Vec<Article>, MyError> {
    let rows = sqlx::query_as::<_, Article>(
        r#"
        SELECT *
        FROM articles
        WHERE ($1::bool OR COALESCE(is_login_required, FALSE) = FALSE)
        ORDER BY is_pinned DESC NULLS LAST, date DESC NULLS LAST
        "#,
    )
    .bind(include_login_required)
    .fetch_all(pool)
    .await?;
    Ok(rows)
}

pub async fn get_notes_paginated_db(
    pool: &PgPool,
    params: &PaginationParams,
    include_login_required: bool,
) -> Result<PaginatedArticles, MyError> {
    let page = params.page.unwrap_or(1).max(1);
    let per_page = params.per_page.unwrap_or(5).clamp(1, 100);
    let offset = (page - 1) * per_page;

    let search_pattern = params
        .search
        .as_ref()
        .map(|s| format!("%{}%", s.to_lowercase()));
    let total: i64 = sqlx::query_scalar(
        r#"
        SELECT COUNT(*) as count
        FROM articles
        WHERE ($1::bool OR COALESCE(is_login_required, FALSE) = FALSE)
          AND ($2::text IS NULL OR $2 = ANY(tags))
          AND (
            $3::text IS NULL
            OR LOWER(title) LIKE $3
            OR LOWER(summary) LIKE $3
          )
        "#,
    )
    .bind(include_login_required)
    .bind(params.tag.as_deref())
    .bind(search_pattern.as_deref())
    .fetch_one(pool)
    .await?;

    let rows: Vec<Article> = sqlx::query_as::<_, Article>(
        r#"
        SELECT *
        FROM articles
        WHERE ($1::bool OR COALESCE(is_login_required, FALSE) = FALSE)
          AND ($2::text IS NULL OR $2 = ANY(tags))
          AND (
            $3::text IS NULL
            OR LOWER(title) LIKE $3
            OR LOWER(summary) LIKE $3
          )
        ORDER BY is_pinned DESC NULLS LAST, date DESC NULLS LAST
        LIMIT $4 OFFSET $5
        "#,
    )
    .bind(include_login_required)
    .bind(params.tag.as_deref())
    .bind(search_pattern.as_deref())
    .bind(per_page)
    .bind(offset)
    .fetch_all(pool)
    .await?;

    Ok(PaginatedArticles {
        data: rows,
        total,
        page,
        per_page,
    })
}

/**
 * get a single article by id from the database
 * @param pool
 * @param article_id
 * @return Result<Article, MyError>
 */
pub async fn get_article_by_id_db(
    pool: &PgPool,
    article_id: i32,
    include_login_required: bool,
) -> Result<Article, MyError> {
    let row = sqlx::query_as::<_, Article>(
        r#"
        SELECT *
        FROM articles
        WHERE id = $1
          AND ($2::bool OR COALESCE(is_login_required, FALSE) = FALSE)
        "#,
    )
    .bind(article_id)
    .bind(include_login_required)
    .fetch_optional(pool)
    .await?
    .ok_or_else(|| MyError::NotFound("Article Id not found".into()))?;
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

    let is_pinned: bool = if let Some(is_pinned) = update_article.is_pinned {
        is_pinned
    } else {
        current_article_row.is_pinned.unwrap_or(false)
    };

    let is_login_required: bool = if let Some(is_login_required) = update_article.is_login_required
    {
        is_login_required
    } else {
        current_article_row.is_login_required.unwrap_or(false)
    };

    let updated_article_row = sqlx::query_as::<_, Article>(
        r#"
        UPDATE articles
        SET title = $1, content = $2, summary = $3, tags = $4, is_pinned = $5, is_login_required = $6
        WHERE id = $7
        RETURNING *
        "#,
    )
    .bind(title)
    .bind(content)
    .bind(summary)
    .bind(tags)
    .bind(is_pinned)
    .bind(is_login_required)
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
    let is_pinned = create_article.is_pinned.unwrap_or(false);
    let is_login_required = create_article.is_login_required.unwrap_or(false);
    let new_article_row = sqlx::query_as::<_, Article>(
        r#"
        INSERT INTO articles (title, content, summary, tags, date, is_pinned, is_login_required)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
        "#,
    )
    .bind(create_article.title)
    .bind(create_article.content)
    .bind(create_article.summary)
    .bind(create_article.tags)
    .bind(now)
    .bind(is_pinned)
    .bind(is_login_required)
    .fetch_one(pool)
    .await?;

    Ok(new_article_row)
}
