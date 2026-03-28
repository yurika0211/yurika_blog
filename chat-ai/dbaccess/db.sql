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

-- 向量检索依赖 pgvector 扩展
CREATE EXTENSION IF NOT EXISTS vector;

-- 长期记忆分块表（用于 RAG 检索与低频历史提及）
CREATE TABLE IF NOT EXISTS memory_chunks (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    conversation_id TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    embedding VECTOR(1536),
    embedding_model TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_memory_chunks_user_conv_time
    ON memory_chunks (user_id, conversation_id, created_at DESC);

-- 向量索引：用于 embedding <=> query 的近邻搜索
CREATE INDEX IF NOT EXISTS idx_memory_chunks_embedding_ivfflat
    ON memory_chunks USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);
