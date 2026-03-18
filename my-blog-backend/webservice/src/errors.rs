use actix_web::{HttpResponse, error, http::StatusCode};
use serde::Serialize;
use sqlx::error::Error as SQLxError;
use std::fmt;

#[derive(Debug, Serialize)]
pub enum MyError {
    DBError(String),
    ActixError(String),
    NotFound(String),
}

#[derive(Debug, Serialize)]
pub struct MyErrorResponse {
    error_message: String,
}

impl MyError {
    // 对于错误类型的分配，这里使用了一个枚举
    fn error_response(&self) -> String {
        match self {
            MyError::DBError(msg) => {
                println!("Database error occurred: {:?}", msg);
                "Database error".into()
            }
            MyError::ActixError(msg) => {
                println!("Server error occurred: {:?}", msg);
                "Internal server error".into()
            }
            MyError::NotFound(msg) => {
                println!("Not found error occurred: {:?}", msg);
                "Not found".into()
            }
        }
    }
}

impl error::ResponseError for MyError {
    // 返回错误状态码
    fn status_code(&self) -> StatusCode {
        match self {
            MyError::DBError(_msg) | MyError::ActixError(_msg) => StatusCode::INTERNAL_SERVER_ERROR,
            MyError::NotFound(_msg) => StatusCode::NOT_FOUND,
        }
    }
    // 错误返回
    fn error_response(&self) -> HttpResponse {
        HttpResponse::build(self.status_code()).json(MyErrorResponse {
            error_message: self.error_response(),
        })
    }
}

impl fmt::Display for MyError {
    // 格式化错误信息：展示错误
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.error_response())
    }
}

impl From<actix_web::error::Error> for MyError {
    // 格式化错误信息：actix_web框架错误
    fn from(err: actix_web::error::Error) -> Self {
        MyError::ActixError(err.to_string())
    }
}

impl From<SQLxError> for MyError {
    // 格式化错误信息：数据库错误
    fn from(err: SQLxError) -> Self {
        MyError::DBError(err.to_string())
    }
}
