use sqlx::PgPool;
use std::sync::Mutex;

// 应用的状态，包括健康回应和数据库连接池
pub struct AppState {
    pub health_check_response: String,
    pub visit_count: Mutex<i32>,
    #[allow(dead_code)]
    // pub courses: Mutex<Vec<Course>>,
    pub db: PgPool,
}
