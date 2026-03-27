use chrono::NaiveDateTime;
use dotenv::dotenv;
use sqlx::postgres::PgPoolOptions;
use sqlx::FromRow;
use std::env;
use std::io;

#[derive(Debug, FromRow)]
pub struct Course {
    pub id: i32,
    pub teacher_id: i32,
    pub name: String,
    pub time: Option<NaiveDateTime>,
}

#[actix_rt::main]
async fn main() -> io::Result<()> {
    dotenv().ok();

    let database_url = env::var("DATABASE_URL").expect("DATABASE_URL must be set");

    let db_pool = PgPoolOptions::new()
        .max_connections(5)
        .connect(&database_url)
        .await
        .unwrap();

    let courses_list = sqlx::query_as::<_, Course>(
        r#"SELECT id, teacher_id, name, time FROM course WHERE id = $1"#,
    )
    .bind(1)
    .fetch_all(&db_pool)
    .await
    .unwrap();

    println!("{:?}", courses_list);
    Ok(())
}
