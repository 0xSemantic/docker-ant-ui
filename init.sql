-- Initialize Docker Ant UI database
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Activity logs table
CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    container_id VARCHAR(100),
    image_id VARCHAR(100),
    user_id VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB
);

-- Image metadata cache
CREATE TABLE IF NOT EXISTS image_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    docker_image_id VARCHAR(100) UNIQUE NOT NULL,
    repo_tags TEXT[],
    size_bytes BIGINT,
    created_at TIMESTAMP,
    last_pulled TIMESTAMP WITH TIME ZONE,
    pull_count INTEGER DEFAULT 0,
    metadata JSONB,
    created TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User preferences
CREATE TABLE IF NOT EXISTS user_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(100) UNIQUE NOT NULL,
    theme VARCHAR(20) DEFAULT 'dark',
    layout JSONB,
    notifications JSONB,
    created TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Container templates
CREATE TABLE IF NOT EXISTS container_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    image_name VARCHAR(200) NOT NULL,
    command TEXT,
    env_vars JSONB,
    ports JSONB,
    volumes JSONB,
    labels JSONB,
    created_by VARCHAR(100),
    is_public BOOLEAN DEFAULT false,
    created TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_container ON activity_logs(container_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_image ON activity_logs(image_id);
CREATE INDEX IF NOT EXISTS idx_image_cache_created ON image_cache(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_container_templates_public ON container_templates(is_public);

-- Create update trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_image_cache_updated_at BEFORE UPDATE ON image_cache
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON user_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_container_templates_updated_at BEFORE UPDATE ON container_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create views
CREATE VIEW IF NOT EXISTS vw_image_stats AS
SELECT 
    COUNT(*) as total_images,
    SUM(size_bytes) as total_size_bytes,
    COUNT(CASE WHEN array_length(repo_tags, 1) IS NULL OR repo_tags[1] = '<none>:<none>' THEN 1 END) as dangling_count,
    AVG(pull_count) as avg_pull_count,
    MAX(last_pulled) as last_pull_time
FROM image_cache;