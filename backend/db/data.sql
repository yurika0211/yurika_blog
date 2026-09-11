-- Optional authentication schema for manual imports.
-- Do not add default credentials here. Set ADMIN_USERNAME and ADMIN_PASSWORD
-- before starting the backend to bootstrap the first administrator securely.
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(32) NOT NULL DEFAULT 'user',
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_lower
ON users (LOWER(username));
