use crate::errors::MyError;
use crate::models::guestbook::{
    CreateGuestbookMessage, GuestbookMessage, normalize_guestbook_author,
    normalize_guestbook_content,
};
use chrono::Utc;
use sqlx::postgres::PgPool;

pub async fn ensure_guestbook_schema_db(pool: &PgPool) -> Result<(), MyError> {
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS guestbook_messages (
            id SERIAL PRIMARY KEY,
            author VARCHAR(255) NOT NULL,
            author_avatar_url TEXT,
            author_profile_url TEXT,
            content TEXT NOT NULL,
            ip_address VARCHAR(64),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        ALTER TABLE guestbook_messages
        ADD COLUMN IF NOT EXISTS ip_address VARCHAR(64)
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE UNIQUE INDEX IF NOT EXISTS idx_guestbook_messages_ip_address_unique
        ON guestbook_messages(ip_address)
        WHERE ip_address IS NOT NULL
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE INDEX IF NOT EXISTS idx_guestbook_messages_created_at
        ON guestbook_messages(created_at DESC, id DESC)
        "#,
    )
    .execute(pool)
    .await?;

    Ok(())
}

pub async fn list_guestbook_messages_db(pool: &PgPool) -> Result<Vec<GuestbookMessage>, MyError> {
    let rows = sqlx::query_as::<_, GuestbookMessage>(
        r#"
        SELECT id, author, author_avatar_url, author_profile_url, content, created_at
        FROM guestbook_messages
        ORDER BY created_at DESC NULLS LAST, id DESC
        "#,
    )
    .fetch_all(pool)
    .await?;

    Ok(rows)
}

pub async fn create_guestbook_message_db(
    pool: &PgPool,
    payload: CreateGuestbookMessage,
    ip_address: &str,
) -> Result<GuestbookMessage, MyError> {
    let author = normalize_guestbook_author(&payload.author)?;
    let content = normalize_guestbook_content(&payload.content)?;
    let now = Utc::now().naive_utc();

    let exists = sqlx::query_scalar::<_, bool>(
        r#"
        SELECT EXISTS(
            SELECT 1
            FROM guestbook_messages
            WHERE ip_address = $1
        )
        "#,
    )
    .bind(ip_address)
    .fetch_one(pool)
    .await?;

    if exists {
        return Err(MyError::BadRequest(
            "This IP address has already left a guestbook message.".into(),
        ));
    }

    let row = sqlx::query_as::<_, GuestbookMessage>(
        r#"
        INSERT INTO guestbook_messages (author, author_avatar_url, author_profile_url, content, ip_address, created_at)
        VALUES ($1, NULL, NULL, $2, $3, $4)
        RETURNING id, author, author_avatar_url, author_profile_url, content, created_at
        "#,
    )
    .bind(author)
    .bind(content)
    .bind(ip_address)
    .bind(now)
    .fetch_one(pool)
    .await?;

    Ok(row)
}
