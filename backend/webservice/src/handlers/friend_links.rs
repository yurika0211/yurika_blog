use crate::auth::require_authorized;
use crate::db_access::friend_links::*;
use crate::errors::MyError;
use crate::models::friends::{
    CreateFriendLinkApplication, FriendLinkListParams, ReviewFriendLinkApplication,
};
use crate::state::AppState;
use actix_web::{HttpRequest, HttpResponse, web};

pub async fn get_friend_links(app_state: web::Data<AppState>) -> Result<HttpResponse, MyError> {
    get_approved_friend_links_db(&app_state.db)
        .await
        .map(|links| HttpResponse::Ok().json(links))
}

pub async fn create_friend_link_application(
    app_state: web::Data<AppState>,
    payload: web::Json<CreateFriendLinkApplication>,
) -> Result<HttpResponse, MyError> {
    create_friend_link_application_db(&app_state.db, payload.into_inner())
        .await
        .map(|application| HttpResponse::Ok().json(application))
}

pub async fn list_friend_link_applications(
    app_state: web::Data<AppState>,
    query: web::Query<FriendLinkListParams>,
    req: HttpRequest,
) -> Result<HttpResponse, MyError> {
    require_authorized(&req)?;

    list_friend_link_applications_db(&app_state.db, query.into_inner().status)
        .await
        .map(|applications| HttpResponse::Ok().json(applications))
}

pub async fn review_friend_link_application(
    app_state: web::Data<AppState>,
    path: web::Path<i32>,
    payload: web::Json<ReviewFriendLinkApplication>,
    req: HttpRequest,
) -> Result<HttpResponse, MyError> {
    require_authorized(&req)?;

    review_friend_link_application_db(&app_state.db, path.into_inner(), payload.into_inner())
        .await
        .map(|application| HttpResponse::Ok().json(application))
}
