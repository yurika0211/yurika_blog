use crate::errors::MyError;
use chrono::NaiveDateTime;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Serialize, Debug, Clone, FromRow)]
pub struct MomentRow {
    pub id: i32,
    pub author: String,
    pub content: String,
    pub images: Vec<String>,
    pub created_at: Option<NaiveDateTime>,
    pub updated_at: Option<NaiveDateTime>,
}

#[derive(Serialize, Debug, Clone, FromRow)]
pub struct MomentComment {
    pub id: i32,
    pub moment_id: i32,
    pub author: String,
    pub content: String,
    pub created_at: Option<NaiveDateTime>,
}

#[derive(Serialize, Debug, Clone)]
pub struct Moment {
    pub id: i32,
    pub author: String,
    pub content: String,
    pub images: Vec<String>,
    pub created_at: Option<NaiveDateTime>,
    pub updated_at: Option<NaiveDateTime>,
    pub likes_count: i64,
    pub comments_count: i64,
    pub liked_by_device: bool,
    pub comments: Vec<MomentComment>,
}

#[derive(Serialize, Debug, Clone)]
pub struct MomentLikeState {
    pub moment_id: i32,
    pub likes_count: i64,
    pub liked_by_device: bool,
}

#[derive(Deserialize, Debug, Clone)]
pub struct CreateMoment {
    pub author: Option<String>,
    pub content: Option<String>,
    pub images: Option<Vec<String>>,
}

#[derive(Deserialize, Debug, Clone)]
pub struct CreateMomentComment {
    pub author: Option<String>,
    pub content: Option<String>,
}

fn normalize_optional_text(value: &Option<String>) -> Option<String> {
    value
        .as_ref()
        .map(|item| item.trim())
        .filter(|item| !item.is_empty())
        .map(ToOwned::to_owned)
}

pub fn normalize_moment_author(value: &Option<String>) -> String {
    normalize_optional_text(value).unwrap_or_else(|| "Yurika".into())
}

pub fn normalize_moment_content(value: &Option<String>) -> String {
    normalize_optional_text(value).unwrap_or_default()
}

pub fn normalize_moment_images(value: &Option<Vec<String>>) -> Result<Vec<String>, MyError> {
    let images = value
        .clone()
        .unwrap_or_default()
        .into_iter()
        .map(|item| item.trim().to_owned())
        .filter(|item| !item.is_empty())
        .collect::<Vec<_>>();

    if images.len() > 9 {
        return Err(MyError::BadRequest(
            "a moment can contain at most 9 images".into(),
        ));
    }

    let total_size = images.iter().map(|item| item.len()).sum::<usize>();
    if total_size > 8 * 1024 * 1024 {
        return Err(MyError::BadRequest(
            "moment images are too large; please upload smaller files".into(),
        ));
    }

    for image in &images {
        let is_supported = image.starts_with("data:image/")
            || image.starts_with("http://")
            || image.starts_with("https://")
            || image.starts_with("/");

        if !is_supported {
            return Err(MyError::BadRequest(
                "images must be data URLs or valid image URLs".into(),
            ));
        }
    }

    Ok(images)
}

pub fn normalize_moment_comment_author(value: &Option<String>) -> String {
    normalize_optional_text(value).unwrap_or_else(|| "Anonymous user".into())
}

pub fn normalize_moment_comment_content(value: &Option<String>) -> Result<String, MyError> {
    let content = normalize_optional_text(value).unwrap_or_default();

    if content.is_empty() {
        return Err(MyError::BadRequest("comment content is required".into()));
    }

    if content.chars().count() > 1_000 {
        return Err(MyError::BadRequest(
            "comment content must be 1000 characters or fewer".into(),
        ));
    }

    Ok(content)
}

pub fn normalize_device_id(value: Option<&str>) -> Result<String, MyError> {
    let device_id = value
        .map(str::trim)
        .filter(|item| !item.is_empty())
        .ok_or_else(|| MyError::BadRequest("device id is required for likes".into()))?;

    if device_id.len() > 128 {
        return Err(MyError::BadRequest("device id is too long".into()));
    }

    let is_valid = device_id
        .chars()
        .all(|ch| ch.is_ascii_alphanumeric() || matches!(ch, '-' | '_' | '.'));

    if !is_valid {
        return Err(MyError::BadRequest("device id format is invalid".into()));
    }

    Ok(device_id.to_owned())
}
