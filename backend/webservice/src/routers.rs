use crate::handlers::articles::*;
use crate::handlers::comments::*;
use crate::handlers::friend_links::*;
use crate::handlers::general::*;
use crate::handlers::guestbook::*;
use crate::handlers::moments::*;
use crate::handlers::users::*;

use actix_web::web;
// 健康检查的路由配置
pub fn general_routes(cfg: &mut web::ServiceConfig) {
    cfg.route("/health", web::get().to(health_check_handler));
    cfg.route("/github/repos", web::get().to(github_repos_handler));
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

pub fn friend_links_routes(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("/friend-links")
            .route("", web::get().to(get_friend_links))
            .route("/", web::get().to(get_friend_links))
            .route(
                "/applications",
                web::get().to(list_friend_link_applications),
            )
            .route(
                "/applications/",
                web::get().to(list_friend_link_applications),
            )
            .route(
                "/applications",
                web::post().to(create_friend_link_application),
            )
            .route(
                "/applications/",
                web::post().to(create_friend_link_application),
            )
            .route(
                "/applications/{id}",
                web::patch().to(review_friend_link_application),
            ),
    );
}

pub fn moments_routes(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("/moments")
            .route("", web::get().to(get_moments))
            .route("/", web::get().to(get_moments))
            .route("", web::post().to(create_moment))
            .route("/", web::post().to(create_moment))
            .route("/{id}", web::delete().to(delete_moment))
            .route("/{id}/comments", web::post().to(create_moment_comment))
            .route("/{id}/comments/", web::post().to(create_moment_comment))
            .route(
                "/{id}/comments/{comment_id}",
                web::delete().to(delete_moment_comment),
            )
            .route("/{id}/like", web::post().to(like_moment))
            .route("/{id}/like", web::delete().to(unlike_moment)),
    );
}

pub fn guestbook_routes(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("/guestbook")
            .route("/messages", web::get().to(get_guestbook_messages))
            .route("/messages", web::post().to(create_guestbook_message)),
    );
}

pub fn user_routes(cfg: &mut web::ServiceConfig) {
    cfg.service(web::scope("/login").route("", web::post().to(login_handler)));
}
