use sqlx::PgPool;
use std::collections::{HashMap, VecDeque};
use std::sync::Mutex;
use std::time::{Duration, Instant};

const LOGIN_WINDOW: Duration = Duration::from_secs(300);
const LOGIN_ATTEMPT_LIMIT: usize = 10;
const MAX_TRACKED_LOGIN_KEYS: usize = 10_000;

pub struct LoginRateLimiter {
    attempts: Mutex<HashMap<String, VecDeque<Instant>>>,
}

impl Default for LoginRateLimiter {
    fn default() -> Self {
        Self {
            attempts: Mutex::new(HashMap::new()),
        }
    }
}

impl LoginRateLimiter {
    pub fn allow(&self, key: &str) -> bool {
        let now = Instant::now();
        let cutoff = now.checked_sub(LOGIN_WINDOW).unwrap_or(now);
        let mut attempts = match self.attempts.lock() {
            Ok(attempts) => attempts,
            Err(_) => return false,
        };
        attempts.retain(|_, history| {
            while history.front().is_some_and(|attempt| *attempt <= cutoff) {
                history.pop_front();
            }
            !history.is_empty()
        });
        if !attempts.contains_key(key) && attempts.len() >= MAX_TRACKED_LOGIN_KEYS {
            return false;
        }
        let history = attempts.entry(key.to_owned()).or_default();
        if history.len() >= LOGIN_ATTEMPT_LIMIT {
            return false;
        }
        history.push_back(now);
        true
    }
}

#[cfg(test)]
mod tests {
    use super::LoginRateLimiter;

    #[test]
    fn blocks_after_ten_attempts_for_the_same_key() {
        let limiter = LoginRateLimiter::default();
        for _ in 0..10 {
            assert!(limiter.allow("127.0.0.1:admin"));
        }
        assert!(!limiter.allow("127.0.0.1:admin"));
        assert!(limiter.allow("127.0.0.1:other"));
    }
}

// 应用的状态，包括健康回应和数据库连接池
pub struct AppState {
    pub health_check_response: String,
    pub visit_count: Mutex<i32>,
    pub login_rate_limiter: LoginRateLimiter,
    #[allow(dead_code)]
    // pub courses: Mutex<Vec<Course>>,
    pub db: PgPool,
}
