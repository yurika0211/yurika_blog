use crate::handlers::articles::*;
use crate::handlers::comments::*;
use crate::handlers::general::*;
use crate::handlers::users::*;
use tracing::{debug, error, info, warn}; // 引入日志宏

use actix_web::web;
// 健康检查的路由配置
pub fn general_routes(cfg: &mut web::ServiceConfig) {
    cfg.route("/health", web::get().to(health_check_handler));
}

// blog的路由配置
pub fn articles_routes(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("/posts")
            .route("/", web::get().to(get_all_notes))
            .route("/{id}", web::get().to(get_article_by_id))
            .route("/{id}", web::put().to(update_article_by_id))
            .route("/{id}", web::delete().to(delete_article_by_id))
            .route("/", web::post().to(create_article)),
    );
}

pub fn comments_routes(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("/comments")
            .route("/{id}", web::get().to(get_comment_by_id))
            .route("/{id}", web::delete().to(delete_comment_by_id))
            .route("/", web::post().to(post_new_comment)),
    );
}

pub fn user_routes(cfg: &mut web::ServiceConfig) {
    cfg.service(web::scope("/login").route("", web::post().to(login_handler)));
}
