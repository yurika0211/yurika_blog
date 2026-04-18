use std::fmt::Debug;

use serde::Serialize;
use sqlx::FromRow;

#[derive(Serialize, Debug, Clone, FromRow)]
pub struct User {
    pub id: i32,
    pub username: String,
    pub password_hash: String,
}
