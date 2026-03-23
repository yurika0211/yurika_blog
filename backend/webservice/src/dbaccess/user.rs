use crate::errors::MyError;
use crate::models::users::User;
use sqlx::postgres::PgPool;
use tracing::debug; // 引入日志宏

pub async fn get_user_by_username(pool: &PgPool, username: String) -> Result<User, MyError> {
    debug!(">>> 开始执行数据库查询，目标用户名: [{}] <<<", username);
    let user = sqlx::query_as::<_, User>("select * from users where username = $1")
        .bind(username)
        .fetch_one(pool)
        .await?;
    Ok(user)
}
