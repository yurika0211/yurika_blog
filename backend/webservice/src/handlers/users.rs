use crate::{db_access::user::get_user_by_username, errors::MyError, state::*};
use actix_web::{error::ErrorUnauthorized, web};
use argon2::{
    Argon2,
    password_hash::{PasswordHash, PasswordVerifier},
};
use jsonwebtoken::{EncodingKey, Header, encode};
use serde::{Deserialize, Serialize};
use tracing::debug; // 引入日志宏

#[cfg(test)]
use argon2::password_hash::{PasswordHasher, SaltString, rand_core::OsRng};

#[derive(Deserialize)]
pub struct LoginRequest {
    pub username: String,
    pub password: String,
}

#[derive(Serialize)]
pub struct LoginResponse {
    pub token: String,
}

#[derive(Serialize)]
struct Claims {
    sub: String,
    exp: usize,
}

pub async fn login_handler(
    app_state: web::Data<AppState>,
    payload: web::Json<LoginRequest>,
) -> Result<web::Json<LoginResponse>, MyError> {
    debug!(">>> 开始执行数据库查询<<<");
    let payload = payload.into_inner();
    let user = get_user_by_username(&app_state.db, payload.username).await?;

    let is_valid = verify_password(&payload.password, &user.password_hash);

    if !is_valid {
        return Err(ErrorUnauthorized("invalid username or password").into());
    }

    let expiration = chrono::Utc::now()
        .checked_add_signed(chrono::Duration::hours(2))
        .expect("valid timestamp")
        .timestamp() as usize;

    let claims = Claims {
        sub: user.id.to_string(),
        exp: expiration,
    };

    let secret = "shiokou";
    let token = encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(secret.as_ref()),
    )
    .map_err(|err| MyError::ActixError(format!("Token generation failed: {err}")))?;

    Ok(web::Json(LoginResponse { token }))
}

fn verify_password(password: &str, password_hash: &str) -> bool {
    let parsed_hash = match PasswordHash::new(password_hash) {
        Ok(hash) => hash,
        Err(_) => return false,
    };

    Argon2::default()
        .verify_password(password.as_bytes(), &parsed_hash)
        .is_ok()
}

#[test]
fn generate_real_hash_for_admin() {
    let password = b"shiokou0408";
    // 随机生成盐值
    let salt = SaltString::generate(&mut OsRng);
    // 生成真实的 Argon2 哈希
    let argon2 = Argon2::default();
    let password_hash = argon2.hash_password(password, &salt).unwrap().to_string();

    println!(">>> 请把下面这串真实的哈希值复制到数据库里替换掉假的 <<<");
    println!("{}", password_hash);
}
