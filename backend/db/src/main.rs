use chrono::NaiveDateTime;
use dotenv::dotenv;
use sqlx::postgres::PgPoolOptions;
use std::env;
use std::io;

#[derive(Debug)]
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
    let articles_rows = sqlx::query!(
        r#"SELECT id, teacher_id, name, time FROM course where id = $1"#,
        1
    )
    .fetch_all(&db_pool)
    .await
    .unwrap();

    let mut courses_list = vec![];
    for row in articles_rows {
        courses_list.push(Course {
            id: row.id,
            teacher_id: row.teacher_id,
            name: row.name,
            time: Some(chrono::NaiveDateTime::from(row.time.unwrap())),
        });
    }
    println!("{:?}", courses_list);
    Ok(())
}
