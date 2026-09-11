use crate::{
    auth::{self, Claims, JWT_AUDIENCE, JWT_ISSUER},
    db_access::user::get_user_by_username,
    errors::MyError,
    state::*,
};
use actix_web::{HttpRequest, web};
use argon2::{
    Argon2, PasswordVerifier,
    password_hash::{PasswordHash, PasswordHasher, SaltString, rand_core::OsRng},
};
use jsonwebtoken::{Algorithm, EncodingKey, Header, encode};
use serde::Deserialize;
use std::sync::OnceLock;
use tracing::debug;

const MAX_USERNAME_CHARS: usize = 128;
const MAX_PASSWORD_CHARS: usize = 1024;

#[derive(Deserialize)]
pub struct LoginRequest {
    pub username: String,
    pub password: String,
}

#[derive(serde::Serialize)]
pub struct LoginResponse {
    pub token: String,
}

pub async fn login_handler(
    app_state: web::Data<AppState>,
    payload: web::Json<LoginRequest>,
    req: HttpRequest,
) -> Result<web::Json<LoginResponse>, MyError> {
    debug!(">>> 开始执行数据库查询<<<");
    let payload = payload.into_inner();
    let username = payload.username.trim();
    if username.is_empty() || username.chars().count() > MAX_USERNAME_CHARS {
        return Err(MyError::BadRequest("Invalid username".into()));
    }
    if payload.password.chars().count() > MAX_PASSWORD_CHARS {
        return Err(MyError::BadRequest("Invalid password".into()));
    }
    let remote = req
        .peer_addr()
        .map(|address| address.ip().to_string())
        .unwrap_or_else(|| "unknown".into());
    let rate_key = format!("{}:{}", remote, username.to_lowercase());
    if !app_state.login_rate_limiter.allow(&rate_key) {
        return Err(MyError::TooManyRequests(
            "Too many login attempts; please try again later".into(),
        ));
    }

    let user = get_user_by_username(&app_state.db, username).await?;
    let Some(user) = user else {
        verify_password(&payload.password, dummy_password_hash());
        return Err(MyError::Unauthorized("用户名或密码错误".into()));
    };

    let is_valid = verify_password(&payload.password, &user.password_hash);

    if !is_valid || !user.is_active {
        return Err(MyError::Unauthorized("用户名或密码错误".into()));
    }

    let expiration = chrono::Utc::now()
        .checked_add_signed(chrono::Duration::minutes(15))
        .expect("valid timestamp")
        .timestamp() as usize;

    let claims = Claims {
        sub: user.id.to_string(),
        role: user.role,
        exp: expiration,
        iss: JWT_ISSUER.into(),
        aud: JWT_AUDIENCE.into(),
    };

    let secret = auth::jwt_secret()?;
    let token = encode(
        &Header::new(Algorithm::HS256),
        &claims,
        &EncodingKey::from_secret(secret.as_bytes()),
    )
    .map_err(|err| MyError::ActixError(format!("Token generation failed: {err}")))?;

    Ok(web::Json(LoginResponse { token }))
}

fn dummy_password_hash() -> &'static str {
    static HASH: OnceLock<String> = OnceLock::new();
    HASH.get_or_init(|| {
        let salt = SaltString::generate(&mut OsRng);
        Argon2::default()
            .hash_password(b"invalid-login", &salt)
            .expect("dummy password hash must be generated")
            .to_string()
    })
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
