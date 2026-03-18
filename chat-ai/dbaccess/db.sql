CREATE TABLE messages (
    -- 如果你的 id 是自增数字：
    id BIGSERIAL PRIMARY KEY,

    -- 关联的用户 ID（假设也是数字）
    user_id BIGINT NOT NULL,

    -- 消息内容，使用 TEXT 适合存储长文本
    content TEXT NOT NULL,

    -- 强烈建议加上创建时间，这在业务逻辑中非常有用
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 为了加快根据 user_id 查询消息的速度，建议加一个索引
CREATE INDEX idx_messages_user_id ON messages(user_id);
