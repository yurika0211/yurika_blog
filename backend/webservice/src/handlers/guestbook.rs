use crate::db_access::guestbook::{create_guestbook_message_db, list_guestbook_messages_db};
use crate::errors::MyError;
use crate::models::guestbook::CreateGuestbookMessage;
use crate::state::AppState;
use actix_web::{HttpRequest, HttpResponse, web};
use std::net::{IpAddr, SocketAddr};

fn normalize_ip_candidate(value: &str) -> Option<String> {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        return None;
    }

    let first_hop = trimmed.split(',').next()?.trim();
    if first_hop.is_empty() {
        return None;
    }

    if let Ok(ip) = first_hop.parse::<IpAddr>() {
        return Some(ip.to_string());
    }

    if let Ok(socket_addr) = first_hop.parse::<SocketAddr>() {
        return Some(socket_addr.ip().to_string());
    }

    None
}

fn extract_client_ip(req: &HttpRequest) -> Result<String, MyError> {
    let forwarded = req
        .headers()
        .get("X-Forwarded-For")
        .and_then(|value| value.to_str().ok())
        .and_then(normalize_ip_candidate);

    let real_ip = req
        .headers()
        .get("X-Real-IP")
        .and_then(|value| value.to_str().ok())
        .and_then(normalize_ip_candidate);

    let connection_ip = req
        .connection_info()
        .realip_remote_addr()
        .and_then(normalize_ip_candidate);

    forwarded
        .or(real_ip)
        .or(connection_ip)
        .ok_or_else(|| MyError::BadRequest("Unable to determine client IP address".into()))
}

pub async fn get_guestbook_messages(
    app_state: web::Data<AppState>,
) -> Result<HttpResponse, MyError> {
    list_guestbook_messages_db(&app_state.db)
        .await
        .map(|messages| HttpResponse::Ok().json(messages))
}

pub async fn create_guestbook_message(
    app_state: web::Data<AppState>,
    payload: web::Json<CreateGuestbookMessage>,
    req: HttpRequest,
) -> Result<HttpResponse, MyError> {
    let client_ip = extract_client_ip(&req)?;

    create_guestbook_message_db(&app_state.db, payload.into_inner(), &client_ip)
        .await
        .map(|message| HttpResponse::Ok().json(message))
}
