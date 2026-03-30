use crate::db_access::blog::*;
use crate::errors::MyError;
use crate::models::articles::{CreateArticle, PaginationParams, UpdateArticle};
use crate::state::AppState;
use actix_web::{HttpResponse, web};


/**
 * get all of the notes from the database
 * supports optional pagination via query params: ?page=1&per_page=5&tag=xxx&search=xxx
 * if page is not provided, returns all articles (backward compat)
*/
pub async fn get_all_notes(
    app_state: web::Data<AppState>,
    query: web::Query<PaginationParams>,
) -> Result<HttpResponse, MyError> {
    let params = query.into_inner();
    if params.page.is_some() {
        get_notes_paginated_db(&app_state.db, &params)
            .await
            .map(|result| HttpResponse::Ok().json(result))
    } else {
        get_all_notes_db(&app_state.db)
            .await
            .map(|articles| HttpResponse::Ok().json(articles))
    }
}

/**
 * get a single article by id from the database
 * @param app_state
 * @param params
 * @return Result<HttpResponse, MyError>
*/
pub async fn get_article_by_id(
    app_state: web::Data<AppState>,
    params: web::Path<(usize,)>,
) -> Result<HttpResponse, MyError> {
    let article_id = i32::try_from(params.0).unwrap();
    get_article_by_id_db(&app_state.db, article_id)
        .await
        .map(|article| HttpResponse::Ok().json(article))
}

/**
 * update a single article by id in the database
 * @param app_state
 * @param update_article
 * @param path
 * @return Result<HttpResponse, MyError>
*/
pub async fn update_article_by_id(
    app_state: web::Data<AppState>,
    update_article: web::Json<UpdateArticle>,
    path: web::Path<i32>,
) -> Result<HttpResponse, MyError> {
    let article_id = path.into_inner();
    update_article_by_id_db(&app_state.db, article_id, update_article.into_inner())
        .await
        .map(|article| HttpResponse::Ok().json(article))
}

/**
 * delete a single article by id from the database
 * @param app_state
 * @param path
 * @return Result<HttpResponse, MyError>
 */
pub async fn delete_article_by_id(
    app_state: web::Data<AppState>,
    path: web::Path<i32>,
) -> Result<HttpResponse, MyError> {
    let article_id = path.into_inner();
    delete_article_by_id_db(&app_state.db, article_id)
        .await
        .map(|message| HttpResponse::Ok().json(message))
}

/**
 * create a new article in the database
 * @param app_state
 * @param create_article
 * @return Result<HttpResponse, MyError>
 */
pub async fn create_article(
    app_state: web::Data<AppState>,
    create_article: web::Json<CreateArticle>,
) -> Result<HttpResponse, MyError> {
    create_article_db(&app_state.db, create_article.into_inner())
        .await
        .map(|article| HttpResponse::Ok().json(article))
}
