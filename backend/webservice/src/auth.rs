use crate::errors::MyError;
use actix_web::HttpRequest;
use jsonwebtoken::{Algorithm, DecodingKey, Validation, decode};
use serde::{Deserialize, Serialize};
use std::env;

const MIN_JWT_SECRET_BYTES: usize = 32;
pub const JWT_ISSUER: &str = "yurika-blog";
pub const JWT_AUDIENCE: &str = "yurika-client";
pub const ADMIN_ROLE: &str = "admin";

pub fn jwt_secret() -> Result<String, MyError> {
    let secret = env::var("JWT_SECRET")
        .map_err(|_| MyError::ActixError("JWT_SECRET is not configured".into()))?;
    if secret.trim().len() < MIN_JWT_SECRET_BYTES {
        return Err(MyError::ActixError(format!(
            "JWT_SECRET must be at least {MIN_JWT_SECRET_BYTES} bytes"
        )));
    }
    Ok(secret)
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct Claims {
    pub sub: String,
    pub role: String,
    pub exp: usize,
    pub iss: String,
    pub aud: String,
}

#[derive(Debug, Clone)]
pub struct AuthContext {
    pub user_id: i32,
    pub role: String,
}

fn validation() -> Validation {
    let mut validation = Validation::new(Algorithm::HS256);
    validation.set_issuer(&[JWT_ISSUER]);
    validation.set_audience(&[JWT_AUDIENCE]);
    validation
}

fn bearer_token(req: &HttpRequest) -> Option<&str> {
    let value = req.headers().get("Authorization")?.to_str().ok()?;
    let mut parts = value.split_whitespace();
    match (parts.next(), parts.next(), parts.next()) {
        (Some(scheme), Some(token), None) if scheme.eq_ignore_ascii_case("bearer") => Some(token),
        _ => None,
    }
}

pub fn authenticate(req: &HttpRequest) -> Option<AuthContext> {
    let token = bearer_token(req)?;
    let claims = decode::<Claims>(
        token,
        &DecodingKey::from_secret(jwt_secret().ok()?.as_bytes()),
        &validation(),
    )
    .ok()?
    .claims;

    let user_id = claims.sub.parse::<i32>().ok()?;
    if user_id <= 0 || claims.role.trim().is_empty() {
        return None;
    }

    Some(AuthContext {
        user_id,
        role: claims.role,
    })
}

pub fn is_authorized(req: &HttpRequest) -> bool {
    authenticate(req).is_some()
}

pub fn require_authorized(req: &HttpRequest) -> Result<AuthContext, MyError> {
    authenticate(req)
        .ok_or_else(|| MyError::Unauthorized("Please log in before performing this action".into()))
}

pub fn require_admin(req: &HttpRequest) -> Result<AuthContext, MyError> {
    let auth = require_authorized(req)?;
    if auth.role == ADMIN_ROLE {
        return Ok(auth);
    }

    Err(MyError::Forbidden(
        "Administrator permission is required for this action".into(),
    ))
}
