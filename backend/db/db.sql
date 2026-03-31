-- 1. Clean up the misspelled table
DROP TABLE IF EXISTS articles;

-- 2. Create the table with the correct name
CREATE TABLE articles (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    summary TEXT,
    content TEXT NOT NULL,
    tags TEXT[],                        -- Array of text
    date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_pinned BOOLEAN DEFAULT FALSE,
    is_login_required BOOLEAN NOT NULL DEFAULT FALSE
);

-- 3. Insert data (Corrected column name and Array formatting)
INSERT INTO articles (date, summary, tags, title, content)
VALUES
    ('2023-01-01', 'Summary 1', '{Tag1}', 'Title 1', 'Content 1'),
    ('2023-01-02', 'Summary 2', '{Tag2, TagA}', 'Title 2', 'Content 2'),
    ('2023-01-03', 'Summary 3', ARRAY['Tag3'], 'Title 3', 'Content 3');

-- 4. Create the table of comment
create table comments (
    id SERIAL PRIMARY KEY,
    article_id INTEGER REFERENCES articles(id),
    author VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Insert data into comments
INSERT INTO comments (article_id, author, content)
VALUES
    (1, 'Author 1', 'Comment 1'),
    (2, 'Author 2', 'Comment 2'),
    (3, 'Author 3', 'Comment 3');

CREATE TABLE IF NOT EXISTS friend_link_applications (
    id SERIAL PRIMARY KEY,
    site_name VARCHAR(255) NOT NULL,
    site_url TEXT NOT NULL,
    description TEXT NOT NULL,
    avatar_url TEXT NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'pending',
    review_note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS moments (
    id SERIAL PRIMARY KEY,
    author VARCHAR(255) NOT NULL,
    content TEXT NOT NULL DEFAULT '',
    images TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
