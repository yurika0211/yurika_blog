use std::fmt::Debug;

use crate::errors::MyError;
use actix_web::web;
use chrono::NaiveDateTime;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Clone, Serialize, FromRow)]
pub struct Comment {
    pub id: i32,
    pub article_id: Option<i32>,
    pub author: String,
    pub content: String,
    pub date: Option<NaiveDateTime>,
}

#[derive(Deserialize, Debug, Clone)]
pub struct CreateComment {
    pub article_id: Option<i32>,
    pub author: Option<String>,
    pub content: Option<String>,
    pub date: Option<NaiveDateTime>,
}

#[derive(Deserialize, Debug, Clone)]
pub struct UpdateComment {
    pub article_id: Option<i32>,
    pub author: Option<String>,
    pub content: Option<String>,
    pub date: Option<NaiveDateTime>,
}

impl From<web::Json<Comment>> for Comment {
    fn from(comment: web::Json<Comment>) -> Self {
        Comment {
            id: comment.id,
            article_id: comment.article_id.clone(),
            author: comment.author.clone(),
            content: comment.content.clone(),
            date: comment.date.clone(),
        }
    }
}

impl TryFrom<web::Json<CreateComment>> for CreateComment {
    type Error = MyError;
    fn try_from(comment: web::Json<CreateComment>) -> Result<CreateComment, MyError> {
        Ok(CreateComment {
            article_id: comment.article_id.clone(),
            author: comment.author.clone(),
            content: comment.content.clone(),
            date: comment.date.clone(),
        })
    }
}

impl From<web::Json<UpdateComment>> for UpdateComment {
    fn from(comment: web::Json<UpdateComment>) -> Self {
        UpdateComment {
            article_id: comment.article_id.clone(),
            author: comment.author.clone(),
            content: comment.content.clone(),
            date: comment.date.clone(),
        }
    }
}
