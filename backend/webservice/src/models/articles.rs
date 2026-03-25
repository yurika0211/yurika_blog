use crate::errors::MyError;
use actix_web::web;
use chrono::NaiveDateTime;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use std::convert::TryFrom;

#[derive(Serialize, Debug, Clone, FromRow)]
pub struct Article {
    pub id: i32,
    pub title: String,
    pub date: Option<NaiveDateTime>,
    pub summary: Option<String>,
    pub tags: Option<Vec<String>>,
    pub content: Option<String>,
    pub is_pinned: Option<bool>,
}

#[derive(Deserialize, Debug, Clone)]
pub struct PaginationParams {
    pub page: Option<i64>,
    pub per_page: Option<i64>,
    pub tag: Option<String>,
    pub search: Option<String>,
}

#[derive(Serialize, Debug, Clone)]
pub struct PaginatedArticles {
    pub data: Vec<Article>,
    pub total: i64,
    pub page: i64,
    pub per_page: i64,
}

#[derive(Deserialize, Debug, Clone)]
pub struct CreateArticle {
    pub title: Option<String>,
    pub date: Option<NaiveDateTime>,
    pub summary: Option<String>,
    pub tags: Option<Vec<String>>,
    pub content: Option<String>,
    pub is_pinned: Option<bool>,
}

#[derive(Deserialize, Debug, Clone)]
pub struct UpdateArticle {
    pub title: Option<String>,
    pub date: Option<NaiveDateTime>,
    pub summary: Option<String>,
    pub tags: Option<Vec<String>>,
    pub content: Option<String>,
    pub is_pinned: Option<bool>,
}

impl From<web::Json<Article>> for Article {
    fn from(article: web::Json<Article>) -> Self {
        Article {
            id: article.id,
            title: article.title.clone(),
            date: article.date.clone(),
            summary: article.summary.clone(),
            tags: article.tags.clone(),
            content: article.content.clone(),
            is_pinned: article.is_pinned,
        }
    }
}

impl TryFrom<web::Json<CreateArticle>> for CreateArticle {
    type Error = MyError;
    fn try_from(article: web::Json<CreateArticle>) -> Result<CreateArticle, MyError> {
        Ok(CreateArticle {
            title: article.title.clone(),
            date: article.date.clone(),
            summary: article.summary.clone(),
            tags: article.tags.clone(),
            content: article.content.clone(),
            is_pinned: article.is_pinned,
        })
    }
}

impl From<web::Json<UpdateArticle>> for UpdateArticle {
    fn from(article: web::Json<UpdateArticle>) -> Self {
        UpdateArticle {
            title: article.title.clone(),
            date: article.date.clone(),
            summary: article.summary.clone(),
            tags: article.tags.clone(),
            content: article.content.clone(),
            is_pinned: article.is_pinned,
        }
    }
}
