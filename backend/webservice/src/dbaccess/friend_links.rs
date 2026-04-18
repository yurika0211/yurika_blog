use crate::errors::MyError;
use crate::models::friends::{
    CreateFriendLinkApplication, FRIEND_LINK_STATUS_PENDING, FriendLinkApplication,
    ReviewFriendLinkApplication, normalize_friend_link_status, normalize_optional_text,
    require_http_url, require_non_empty_text,
};
use chrono::Utc;
use sqlx::postgres::PgPool;

pub async fn get_approved_friend_links_db(
    pool: &PgPool,
) -> Result<Vec<FriendLinkApplication>, MyError> {
    let rows = sqlx::query_as::<_, FriendLinkApplication>(
        r#"
        SELECT *
        FROM friend_link_applications
        WHERE status = $1
        ORDER BY reviewed_at DESC NULLS LAST, created_at DESC NULLS LAST, id DESC
        "#,
    )
    .bind("approved")
    .fetch_all(pool)
    .await?;

    Ok(rows)
}

pub async fn list_friend_link_applications_db(
    pool: &PgPool,
    status: Option<String>,
) -> Result<Vec<FriendLinkApplication>, MyError> {
    let normalized_status = status
        .as_deref()
        .map(normalize_friend_link_status)
        .transpose()?;

    let rows = sqlx::query_as::<_, FriendLinkApplication>(
        r#"
        SELECT *
        FROM friend_link_applications
        WHERE ($1::text IS NULL OR status = $1)
        ORDER BY
            CASE status
                WHEN 'pending' THEN 0
                WHEN 'approved' THEN 1
                ELSE 2
            END,
            created_at DESC NULLS LAST,
            id DESC
        "#,
    )
    .bind(normalized_status.as_deref())
    .fetch_all(pool)
    .await?;

    Ok(rows)
}

pub async fn create_friend_link_application_db(
    pool: &PgPool,
    payload: CreateFriendLinkApplication,
) -> Result<FriendLinkApplication, MyError> {
    let site_name = require_non_empty_text(&payload.site_name, "site_name")?;
    let site_url = require_http_url(&payload.site_url, "site_url")?;
    let description = require_non_empty_text(&payload.description, "description")?;
    let avatar_url = require_http_url(&payload.avatar_url, "avatar_url")?;
    let now = Utc::now().naive_utc();

    let row = sqlx::query_as::<_, FriendLinkApplication>(
        r#"
        INSERT INTO friend_link_applications (
            site_name,
            site_url,
            description,
            avatar_url,
            status,
            created_at,
            updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $6)
        RETURNING *
        "#,
    )
    .bind(site_name)
    .bind(site_url)
    .bind(description)
    .bind(avatar_url)
    .bind(FRIEND_LINK_STATUS_PENDING)
    .bind(now)
    .fetch_one(pool)
    .await?;

    Ok(row)
}

pub async fn review_friend_link_application_db(
    pool: &PgPool,
    application_id: i32,
    payload: ReviewFriendLinkApplication,
) -> Result<FriendLinkApplication, MyError> {
    let status = payload
        .status
        .as_deref()
        .ok_or_else(|| MyError::BadRequest("status is required".into()))
        .and_then(normalize_friend_link_status)?;
    let review_note = normalize_optional_text(&payload.review_note);
    let now = Utc::now().naive_utc();

    let row = sqlx::query_as::<_, FriendLinkApplication>(
        r#"
        UPDATE friend_link_applications
        SET
            status = $1,
            review_note = $2,
            updated_at = $3,
            reviewed_at = CASE
                WHEN $1 = 'pending' THEN NULL
                ELSE $3
            END
        WHERE id = $4
        RETURNING *
        "#,
    )
    .bind(status)
    .bind(review_note)
    .bind(now)
    .bind(application_id)
    .fetch_optional(pool)
    .await?
    .ok_or_else(|| MyError::NotFound("Friend link application not found".into()))?;

    Ok(row)
}
