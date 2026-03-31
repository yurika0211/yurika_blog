use crate::errors::MyError;
use chrono::NaiveDateTime;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

pub const FRIEND_LINK_STATUS_PENDING: &str = "pending";
pub const FRIEND_LINK_STATUS_APPROVED: &str = "approved";
pub const FRIEND_LINK_STATUS_REJECTED: &str = "rejected";

#[derive(Serialize, Debug, Clone, FromRow)]
pub struct FriendLinkApplication {
    pub id: i32,
    pub site_name: String,
    pub site_url: String,
    pub description: String,
    pub avatar_url: String,
    pub status: String,
    pub review_note: Option<String>,
    pub created_at: Option<NaiveDateTime>,
    pub updated_at: Option<NaiveDateTime>,
    pub reviewed_at: Option<NaiveDateTime>,
}

#[derive(Deserialize, Debug, Clone)]
pub struct CreateFriendLinkApplication {
    pub site_name: Option<String>,
    pub site_url: Option<String>,
    pub description: Option<String>,
    pub avatar_url: Option<String>,
}

#[derive(Deserialize, Debug, Clone)]
pub struct ReviewFriendLinkApplication {
    pub status: Option<String>,
    pub review_note: Option<String>,
}

#[derive(Deserialize, Debug, Clone)]
pub struct FriendLinkListParams {
    pub status: Option<String>,
}

pub fn require_non_empty_text(value: &Option<String>, field_name: &str) -> Result<String, MyError> {
    let cleaned = value
        .as_ref()
        .map(|item| item.trim())
        .filter(|item| !item.is_empty())
        .map(ToOwned::to_owned);

    cleaned.ok_or_else(|| MyError::BadRequest(format!("{field_name} is required")))
}

pub fn normalize_optional_text(value: &Option<String>) -> Option<String> {
    value
        .as_ref()
        .map(|item| item.trim())
        .filter(|item| !item.is_empty())
        .map(ToOwned::to_owned)
}

pub fn require_http_url(value: &Option<String>, field_name: &str) -> Result<String, MyError> {
    let url = require_non_empty_text(value, field_name)?;
    let normalized = url.to_lowercase();
    if normalized.starts_with("http://") || normalized.starts_with("https://") {
        Ok(url)
    } else {
        Err(MyError::BadRequest(format!(
            "{field_name} must start with http:// or https://"
        )))
    }
}

pub fn normalize_friend_link_status(status: &str) -> Result<String, MyError> {
    let normalized = status.trim().to_lowercase();
    match normalized.as_str() {
        FRIEND_LINK_STATUS_PENDING | FRIEND_LINK_STATUS_APPROVED | FRIEND_LINK_STATUS_REJECTED => {
            Ok(normalized)
        }
        _ => Err(MyError::BadRequest(
            "status must be one of pending, approved, rejected".into(),
        )),
    }
}
