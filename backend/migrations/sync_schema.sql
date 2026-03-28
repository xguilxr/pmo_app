-- Comprehensive schema sync: run this against the PostgreSQL database
-- to add all missing columns and tables that SQLAlchemy models define.

-- ══════════════════════════════════════════════════════
-- tasks: add missing columns
-- ══════════════════════════════════════════════════════
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'manual';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS responsible_name VARCHAR(255);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS was_delayed BOOLEAN DEFAULT FALSE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS original_end_date DATE;

-- ══════════════════════════════════════════════════════
-- project_areas: add missing columns
-- ══════════════════════════════════════════════════════
ALTER TABLE project_areas ADD COLUMN IF NOT EXISTS responsible_name_text VARCHAR(255);

-- ══════════════════════════════════════════════════════
-- backlog_items: add missing columns
-- ══════════════════════════════════════════════════════
ALTER TABLE backlog_items ADD COLUMN IF NOT EXISTS was_delayed BOOLEAN DEFAULT FALSE;
ALTER TABLE backlog_items ADD COLUMN IF NOT EXISTS original_end_date DATE;

-- ══════════════════════════════════════════════════════
-- minutes: add missing columns
-- ══════════════════════════════════════════════════════
ALTER TABLE minutes ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'manual';
ALTER TABLE minutes ADD COLUMN IF NOT EXISTS transcript_text TEXT;
ALTER TABLE minutes ADD COLUMN IF NOT EXISTS ai_model_used VARCHAR(100);
ALTER TABLE minutes ADD COLUMN IF NOT EXISTS ai_generation_time_ms INTEGER;

-- ══════════════════════════════════════════════════════
-- progress_reports: create table if not exists
-- ══════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS progress_reports (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP,
    title VARCHAR(255) NOT NULL,
    content_html TEXT NOT NULL,
    period_start DATE,
    period_end DATE,
    status VARCHAR(50) DEFAULT 'draft',
    recipients TEXT,
    sent_date DATE,
    ai_model_used VARCHAR(100),
    ai_generation_time_ms INTEGER,
    project_id INTEGER NOT NULL REFERENCES projects(id),
    generated_by_id INTEGER REFERENCES users(id),
    created_by_id INTEGER REFERENCES users(id)
);

-- ══════════════════════════════════════════════════════
-- project_objectives: create table if not exists
-- ══════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS project_objectives (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP,
    description TEXT NOT NULL,
    type VARCHAR(50) NOT NULL,
    target_value VARCHAR(255),
    current_value VARCHAR(255),
    progress FLOAT DEFAULT 0,
    status VARCHAR(50) DEFAULT 'pending',
    project_id INTEGER NOT NULL REFERENCES projects(id)
);

-- ══════════════════════════════════════════════════════
-- task_dependencies: create table if not exists
-- ══════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS task_dependencies (
    id SERIAL PRIMARY KEY,
    predecessor_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    successor_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    dependency_type VARCHAR(10) DEFAULT 'FS'
);

-- ══════════════════════════════════════════════════════
-- project_requests: create table if not exists
-- ══════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS project_requests (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP,
    folio VARCHAR(50) UNIQUE NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    request_date DATE,
    requester_name VARCHAR(255),
    requester_email VARCHAR(255),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    objective TEXT,
    business_unit VARCHAR(255),
    department VARCHAR(255),
    sub_department VARCHAR(255),
    sponsor_name VARCHAR(255),
    sponsor_email VARCHAR(255),
    strategic_alignment TEXT,
    benefits TEXT,
    budget FLOAT,
    what_if_not_done TEXT,
    key_stakeholders TEXT,
    expected_deliverables TEXT,
    observations TEXT,
    reviewed_by_id INTEGER REFERENCES users(id),
    review_date DATE,
    rejection_reason TEXT,
    organization_id INTEGER REFERENCES organizations(id),
    requester_id INTEGER REFERENCES users(id),
    created_by_id INTEGER REFERENCES users(id)
);
