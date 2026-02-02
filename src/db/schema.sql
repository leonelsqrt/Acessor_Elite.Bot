-- Assessor Elite Bot - Database Schema
-- Timezone: America/Sao_Paulo

-- Users table
CREATE TABLE IF NOT EXISTS users (
    user_id BIGINT PRIMARY KEY,
    username VARCHAR(255),
    first_name VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User settings
CREATE TABLE IF NOT EXISTS user_settings (
    user_id BIGINT PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
    water_goal_ml INTEGER DEFAULT 2000,
    ideal_sleep_start TIME DEFAULT '23:00',
    ideal_sleep_end TIME DEFAULT '07:00',
    timezone VARCHAR(50) DEFAULT 'America/Sao_Paulo',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sleep logs (wake/sleep tracking)
CREATE TABLE IF NOT EXISTS sleep_logs (
    id SERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(user_id) ON DELETE CASCADE,
    log_type VARCHAR(10) NOT NULL CHECK (log_type IN ('wake', 'sleep')),
    logged_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_sleep_logs_user_date ON sleep_logs(user_id, logged_at DESC);

-- Water consumption logs
CREATE TABLE IF NOT EXISTS water_logs (
    id SERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(user_id) ON DELETE CASCADE,
    amount_ml INTEGER NOT NULL,
    logged_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_water_logs_user_date ON water_logs(user_id, logged_at DESC);

-- Event drafts (for create/edit flow)
CREATE TABLE IF NOT EXISTS event_drafts (
    id SERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(user_id) ON DELETE CASCADE,
    state VARCHAR(20) DEFAULT 'collecting' CHECK (state IN ('collecting', 'ready', 'created', 'editing')),
    title VARCHAR(255),
    event_date DATE,
    start_time TIME,
    end_time TIME,
    location VARCHAR(255),
    all_day BOOLEAN DEFAULT FALSE,
    google_event_id VARCHAR(255),
    message_id BIGINT,
    src_message_id BIGINT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_event_drafts_user ON event_drafts(user_id, state);

-- OAuth tokens (Google)
CREATE TABLE IF NOT EXISTS oauth_tokens (
    user_id BIGINT PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    token_type VARCHAR(50) DEFAULT 'Bearer',
    expires_at TIMESTAMP WITH TIME ZONE,
    scope TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bot state tracking (for ForceReply context)
CREATE TABLE IF NOT EXISTS bot_state (
    user_id BIGINT PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
    current_state VARCHAR(50),
    state_data JSONB DEFAULT '{}',
    last_message_id BIGINT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Memories table (AI context and user knowledge)
CREATE TABLE IF NOT EXISTS memories (
    id SERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(user_id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    memory_type VARCHAR(20) DEFAULT 'general' CHECK (memory_type IN ('objective', 'preference', 'personal', 'task', 'general')),
    importance INTEGER DEFAULT 5 CHECK (importance >= 1 AND importance <= 10),
    keywords TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_accessed TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_memories_user ON memories(user_id, memory_type);
CREATE INDEX idx_memories_keywords ON memories USING GIN(keywords);

-- ==================== MÓDULO FINANÇAS ====================

-- Categorias financeiras (personalizadas pelo usuário)
CREATE TABLE IF NOT EXISTS financial_categories (
    id SERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(user_id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    emoji VARCHAR(10) NOT NULL,
    category_type VARCHAR(10) NOT NULL CHECK (category_type IN ('entrada', 'saida')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_financial_categories_user ON financial_categories(user_id, category_type);

-- Transações financeiras
CREATE TABLE IF NOT EXISTS financial_transactions (
    id SERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(user_id) ON DELETE CASCADE,
    category_id INTEGER REFERENCES financial_categories(id) ON DELETE SET NULL,
    transaction_type VARCHAR(10) NOT NULL CHECK (transaction_type IN ('entrada', 'saida')),
    amount DECIMAL(12, 2) NOT NULL,
    description VARCHAR(255),
    transaction_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_financial_transactions_user_date ON financial_transactions(user_id, transaction_date DESC);

-- Contas fixas
CREATE TABLE IF NOT EXISTS fixed_bills (
    id SERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(user_id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    emoji VARCHAR(10) NOT NULL,
    amount DECIMAL(12, 2),
    is_variable BOOLEAN DEFAULT FALSE,
    estimated_amount DECIMAL(12, 2),
    due_day INTEGER NOT NULL CHECK (due_day >= 1 AND due_day <= 31),
    billing_day INTEGER CHECK (billing_day >= 1 AND billing_day <= 31),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_fixed_bills_user ON fixed_bills(user_id, is_active);

-- Valores de contas (histórico mensal)
CREATE TABLE IF NOT EXISTS bill_values (
    id SERIAL PRIMARY KEY,
    bill_id INTEGER REFERENCES fixed_bills(id) ON DELETE CASCADE,
    month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
    year INTEGER NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    is_paid BOOLEAN DEFAULT FALSE,
    paid_at TIMESTAMP WITH TIME ZONE,
    defined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(bill_id, month, year)
);

CREATE INDEX idx_bill_values_bill ON bill_values(bill_id, year, month);

-- Metas financeiras
CREATE TABLE IF NOT EXISTS financial_goals (
    id SERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(user_id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    target_amount DECIMAL(12, 2) NOT NULL,
    current_amount DECIMAL(12, 2) DEFAULT 0,
    is_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_financial_goals_user ON financial_goals(user_id, is_completed);

-- Atividades físicas (módulo saúde)
CREATE TABLE IF NOT EXISTS activities (
    id SERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(user_id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    emoji VARCHAR(10) NOT NULL,
    duration_minutes INTEGER NOT NULL,
    activity_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_activities_user_date ON activities(user_id, activity_date DESC);
