use crate::errors::MyError;
use chrono::NaiveDateTime;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Clone, Serialize, FromRow)]
pub struct GuestbookMessage {
    pub id: i32,
    pub author: String,
    pub author_avatar_url: Option<String>,
    pub author_profile_url: Option<String>,
    pub content: String,
    pub created_at: Option<NaiveDateTime>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreateGuestbookMessage {
    pub author: Option<String>,
    pub content: Option<String>,
}

pub fn normalize_guestbook_author(value: &Option<String>) -> Result<String, MyError> {
    let author = value
        .as_ref()
        .map(|item| item.trim())
        .filter(|item| !item.is_empty())
        .map(ToOwned::to_owned)
        .unwrap_or_else(|| "Guest".to_owned());

    if author.chars().count() > 80 {
        return Err(MyError::BadRequest(
            "author name must be 80 characters or fewer".into(),
        ));
    }

    Ok(author)
}

pub fn normalize_guestbook_content(value: &Option<String>) -> Result<String, MyError> {
    let content = value
        .as_ref()
        .map(|item| item.trim())
        .filter(|item| !item.is_empty())
        .map(ToOwned::to_owned)
        .ok_or_else(|| MyError::BadRequest("message content is required".into()))?;

    if content.chars().count() > 2_000 {
        return Err(MyError::BadRequest(
            "message content must be 2000 characters or fewer".into(),
        ));
    }

    Ok(content)
}
