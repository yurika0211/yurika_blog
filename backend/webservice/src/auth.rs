use crate::errors::MyError;
use actix_web::HttpRequest;
use jsonwebtoken::{DecodingKey, Validation, decode};
use serde::Deserialize;

pub const JWT_SECRET: &str = "shiokou";

#[allow(dead_code)]
#[derive(Deserialize, Clone)]
struct Claims {
    sub: String,
    exp: usize,
}

pub fn is_authorized(req: &HttpRequest) -> bool {
    let token = req
        .headers()
        .get("Authorization")
        .and_then(|value| value.to_str().ok())
        .and_then(|value| {
            let mut parts = value.split_whitespace();
            let scheme = parts.next()?;
            let token = parts.next()?;
            if scheme.eq_ignore_ascii_case("bearer") {
                Some(token)
            } else {
                None
            }
        });

    if let Some(token) = token {
        let validation = Validation::default();
        return decode::<Claims>(
            token,
            &DecodingKey::from_secret(JWT_SECRET.as_ref()),
            &validation,
        )
        .is_ok();
    }

    false
}

pub fn require_authorized(req: &HttpRequest) -> Result<(), MyError> {
    if is_authorized(req) {
        return Ok(());
    }

    Err(MyError::Unauthorized(
        "Please log in before performing this action".into(),
    ))
}
