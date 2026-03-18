use std::fmt::Debug;

use crate::errors::MyError;
use actix_web::web;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Serialize, Debug, Clone, FromRow)]
pub struct User {
    pub id: i32,
    pub username: String,
    pub password_hash: String,
}
