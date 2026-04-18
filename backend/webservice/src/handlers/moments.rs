use crate::auth::require_authorized;
use crate::db_access::moments::*;
use crate::errors::MyError;
use crate::models::moments::{CreateMoment, CreateMomentComment, normalize_device_id};
use crate::state::AppState;
use actix_web::{HttpRequest, HttpResponse, web};

fn read_optional_device_id(req: &HttpRequest) -> Option<String> {
    req.headers()
        .get("X-Device-Id")
        .and_then(|value| value.to_str().ok())
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(ToOwned::to_owned)
}

fn read_required_device_id(req: &HttpRequest) -> Result<String, MyError> {
    let header = req
        .headers()
        .get("X-Device-Id")
        .and_then(|value| value.to_str().ok());

    normalize_device_id(header)
}

pub async fn get_moments(
    app_state: web::Data<AppState>,
    req: HttpRequest,
) -> Result<HttpResponse, MyError> {
    let device_id = read_optional_device_id(&req);

    list_moments_db(&app_state.db, device_id.as_deref())
        .await
        .map(|moments| HttpResponse::Ok().json(moments))
}

pub async fn create_moment(
    app_state: web::Data<AppState>,
    payload: web::Json<CreateMoment>,
    req: HttpRequest,
) -> Result<HttpResponse, MyError> {
    require_authorized(&req)?;

    create_moment_db(&app_state.db, payload.into_inner())
        .await
        .map(|moment| HttpResponse::Ok().json(moment))
}

pub async fn delete_moment(
    app_state: web::Data<AppState>,
    path: web::Path<i32>,
    req: HttpRequest,
) -> Result<HttpResponse, MyError> {
    require_authorized(&req)?;

    delete_moment_db(&app_state.db, path.into_inner())
        .await
        .map(|message| HttpResponse::Ok().json(message))
}

pub async fn create_moment_comment(
    app_state: web::Data<AppState>,
    path: web::Path<i32>,
    payload: web::Json<CreateMomentComment>,
    req: HttpRequest,
) -> Result<HttpResponse, MyError> {
    require_authorized(&req)?;

    create_moment_comment_db(&app_state.db, path.into_inner(), payload.into_inner())
        .await
        .map(|comment| HttpResponse::Ok().json(comment))
}

pub async fn delete_moment_comment(
    app_state: web::Data<AppState>,
    path: web::Path<(i32, i32)>,
    req: HttpRequest,
) -> Result<HttpResponse, MyError> {
    require_authorized(&req)?;

    let (moment_id, comment_id) = path.into_inner();
    delete_moment_comment_db(&app_state.db, moment_id, comment_id)
        .await
        .map(|message| HttpResponse::Ok().json(message))
}

pub async fn like_moment(
    app_state: web::Data<AppState>,
    path: web::Path<i32>,
    req: HttpRequest,
) -> Result<HttpResponse, MyError> {
    let device_id = read_required_device_id(&req)?;

    like_moment_db(&app_state.db, path.into_inner(), &device_id)
        .await
        .map(|state| HttpResponse::Ok().json(state))
}

pub async fn unlike_moment(
    app_state: web::Data<AppState>,
    path: web::Path<i32>,
    req: HttpRequest,
) -> Result<HttpResponse, MyError> {
    let device_id = read_required_device_id(&req)?;

    unlike_moment_db(&app_state.db, path.into_inner(), &device_id)
        .await
        .map(|state| HttpResponse::Ok().json(state))
}
