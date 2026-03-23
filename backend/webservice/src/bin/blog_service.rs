use actix_cors::Cors;
use actix_web::{App, HttpServer, http, web};
use dotenv::dotenv;
use sqlx::postgres::PgPool;
use std::env;
use std::io;
use std::sync::Mutex;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};
#[path = "../dbaccess/mod.rs"]
mod db_access;
#[path = "../errors.rs"]
mod errors;
#[path = "../handlers/mod.rs"]
mod handlers;
#[path = "../models/mod.rs"]
mod models;
#[path = "../routers.rs"]
mod routers;
#[path = "../state.rs"]
mod state;

use routers::*;
use state::AppState;

#[actix_rt::main]
async fn main() -> io::Result<()> {
    tracing_subscriber::fmt()
        .with_max_level(tracing::Level::DEBUG)
        .init();

    tracing::info!("🚀 博客后端服务正在启动...");
    dotenv().ok();

    let database_url = env::var("DATABASE_URL").expect("DATABASE_URL is not set in .env file");
    let db_pool = PgPool::connect(&database_url).await.unwrap();

    let shared_data = web::Data::new(AppState {
        health_check_response: "I'm OK.".to_string(),
        visit_count: Mutex::new(0),
        //     courses: Mutex::new(vec![]),
        db: db_pool,
    });
    HttpServer::new(move || {
        // 配置 CORS
        let cors = Cors::default()
            .allow_any_origin() // 允许任何来源 (开发阶段最方便)
            // 或者指定前端地址: .allowed_origin("http://localhost:5173")
            .allow_any_method() // 允许 GET, POST, DELETE 等
            .allow_any_header() // 允许 Content-Type 等 Header
            .max_age(3600);

        App::new()
            .wrap(cors) // <--- 3. 重点：把 Cors 中间件 wrap 进去
            .app_data(shared_data.clone())
            .configure(general_routes)
            .configure(articles_routes)
            .configure(comments_routes)
            .configure(user_routes)
    })
    .bind("0.0.0.0:3001")?
    .run()
    .await
}
