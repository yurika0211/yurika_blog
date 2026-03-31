use crate::errors::MyError;
use chrono::NaiveDateTime;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Serialize, Debug, Clone, FromRow)]
pub struct Moment {
    pub id: i32,
    pub author: String,
    pub content: String,
    pub images: Option<Vec<String>>,
    pub created_at: Option<NaiveDateTime>,
    pub updated_at: Option<NaiveDateTime>,
}

#[derive(Deserialize, Debug, Clone)]
pub struct CreateMoment {
    pub author: Option<String>,
    pub content: Option<String>,
    pub images: Option<Vec<String>>,
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
