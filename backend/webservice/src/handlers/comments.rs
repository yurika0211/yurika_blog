use crate::db_access::comment::*;
use crate::errors::MyError;
use crate::models::comments::{CreateComment};
use crate::state::AppState;
use actix_web::{HttpResponse, web};

pub async fn get_comment_by_id(
    app_state: web::Data<AppState>,
    params: web::Path<(usize,)>,
) -> Result<HttpResponse, MyError> {
    let article_id = i32::try_from(params.0).unwrap();
    get_comment_by_id_db(&app_state.db, article_id)
        .await
        .map(|comments| HttpResponse::Ok().json(comments))
}

pub async fn delete_comment_by_id(
    app_state: web::Data<AppState>,
    id: web::Path<i32>,
) -> Result<HttpResponse, MyError> {
    let article_id = id.into_inner();
    delete_comment_by_id_db(&app_state.db, article_id)
        .await
        .map(|message| HttpResponse::Ok().json(message))
}

pub async fn post_new_comment(
    app_state: web::Data<AppState>,
    create_comment: web::Json<CreateComment>,
) -> Result<HttpResponse, MyError> {
    post_new_comment_db(&app_state.db, create_comment.into_inner())
        .await
        .map(|article| HttpResponse::Ok().json(article))
}
