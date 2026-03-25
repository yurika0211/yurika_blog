use crate::state::AppState;
use actix_web::{HttpResponse, web};

pub async fn health_check_handler(app_state: web::Data<AppState>) -> HttpResponse {
    let health_check_response = &app_state.health_check_response;
    let mut visit_count = app_state.visit_count.lock().unwrap();
    let response = format!("{}{} times", health_check_response, visit_count);
    *visit_count += 1;
    HttpResponse::Ok().json(&response)
}

pub async fn github_repos_handler() -> HttpResponse {
    let client = reqwest::Client::new();
    let resp = client
        .get("https://api.github.com/users/yurika0211/repos?sort=updated&per_page=6")
        .header("User-Agent", "yurika-blog-backend")
        .send()
        .await;

    match resp {
        Ok(r) => {
            let status = r.status();
            let body = r.text().await.unwrap_or_default();
            HttpResponse::build(actix_web::http::StatusCode::from_u16(status.as_u16()).unwrap_or(actix_web::http::StatusCode::INTERNAL_SERVER_ERROR))
                .content_type("application/json")
                .body(body)
        }
        Err(e) => {
            HttpResponse::BadGateway().json(format!("GitHub API error: {}", e))
        }
    }
}
