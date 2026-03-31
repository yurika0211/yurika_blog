use crate::auth::require_authorized;
use crate::db_access::moments::*;
use crate::errors::MyError;
use crate::models::moments::CreateMoment;
use crate::state::AppState;
use actix_web::{HttpRequest, HttpResponse, web};

pub async fn get_moments(app_state: web::Data<AppState>) -> Result<HttpResponse, MyError> {
    list_moments_db(&app_state.db)
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
