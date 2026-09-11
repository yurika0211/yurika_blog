use crate::errors::MyError;
use crate::models::users::User;
use argon2::{
    Argon2, PasswordHasher,
    password_hash::{SaltString, rand_core::OsRng},
};
use sqlx::postgres::PgPool;
use std::env;
use tracing::{debug, warn};

pub async fn ensure_users_schema_db(pool: &PgPool) -> Result<(), MyError> {
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            username VARCHAR(255) NOT NULL,
            password_hash TEXT NOT NULL,
            role VARCHAR(32) NOT NULL DEFAULT 'user',
            is_active BOOLEAN NOT NULL DEFAULT TRUE
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(32) NOT NULL DEFAULT 'user'",
    )
    .execute(pool)
    .await?;
    sqlx::query(
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE",
    )
    .execute(pool)
    .await?;
    sqlx::query(
        "CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_lower ON users (LOWER(username))",
    )
    .execute(pool)
    .await?;

    Ok(())
}

pub async fn bootstrap_admin_user_db(pool: &PgPool) -> Result<(), MyError> {
    let user_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM users")
        .fetch_one(pool)
        .await?;
    if user_count > 0 {
        return Ok(());
    }

    let password = match env::var("ADMIN_PASSWORD") {
        Ok(value) if !value.is_empty() => value,
        _ => {
            warn!(
                "No users configured; set ADMIN_USERNAME and ADMIN_PASSWORD to bootstrap the first administrator"
            );
            return Ok(());
        }
    };
    if password.chars().count() < 12 {
        return Err(MyError::ActixError(
            "ADMIN_PASSWORD must be at least 12 characters".into(),
        ));
    }

    let username = env::var("ADMIN_USERNAME")
        .unwrap_or_else(|_| "admin".into())
        .trim()
        .to_owned();
    if username.is_empty() || username.chars().count() > 128 {
        return Err(MyError::ActixError(
            "ADMIN_USERNAME must be between 1 and 128 characters".into(),
        ));
    }

    let salt = SaltString::generate(&mut OsRng);
    let password_hash = Argon2::default()
        .hash_password(password.as_bytes(), &salt)
        .map_err(|_| {
            MyError::ActixError("Unable to hash the initial administrator password".into())
        })?
        .to_string();

    sqlx::query(
        "INSERT INTO users (username, password_hash, role, is_active) VALUES ($1, $2, 'admin', TRUE)",
    )
    .bind(username)
    .bind(password_hash)
    .execute(pool)
    .await?;

    Ok(())
}

pub async fn get_user_by_username(pool: &PgPool, username: &str) -> Result<Option<User>, MyError> {
    debug!(">>> 开始执行数据库查询，目标用户名: [{}] <<<", username);
    let user = sqlx::query_as::<_, User>(
        "SELECT id, username, password_hash, role, is_active FROM users WHERE LOWER(username) = LOWER($1) LIMIT 1",
    )
        .bind(username)
        .fetch_optional(pool)
        .await?;
    Ok(user)
}
