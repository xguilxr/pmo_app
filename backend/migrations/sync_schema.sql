-- Comprehensive schema sync: run this against the PostgreSQL database
-- to add all missing columns and tables that SQLAlchemy models define.

-- -------------------------------------------------------
-- tasks: add missing columns
-- -------------------------------------------------------
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'manual';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS responsible_name VARCHAR(255);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS was_delayed BOOLEAN DEFAULT FALSE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS original_end_date DATE;

-- -------------------------------------------------------
-- project_areas: add missing columns
-- -------------------------------------------------------
ALTER TABLE project_areas ADD COLUMN IF NOT EXISTS responsible_name_text VARCHAR(255);

-- -------------------------------------------------------
-- backlog_items: add missing columns
-- -------------------------------------------------------
ALTER TABLE backlog_items ADD COLUMN IF NOT EXISTS was_delayed BOOLEAN DEFAULT FALSE;
ALTER TABLE backlog_items ADD COLUMN IF NOT EXISTS original_end_date DATE;

-- -------------------------------------------------------
-- minutes: add missing columns
-- -------------------------------------------------------
ALTER TABLE minutes ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'manual';
ALTER TABLE minutes ADD COLUMN IF NOT EXISTS transcript_text TEXT;
ALTER TABLE minutes ADD COLUMN IF NOT EXISTS ai_model_used VARCHAR(100);
ALTER TABLE minutes ADD COLUMN IF NOT EXISTS ai_generation_time_ms INTEGER;

-- -------------------------------------------------------
-- progress_reports: create table if not exists
-- -------------------------------------------------------
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

-- -------------------------------------------------------
-- project_objectives: create table if not exists
-- -------------------------------------------------------
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

-- -------------------------------------------------------
-- task_dependencies: create table if not exists
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS task_dependencies (
    id SERIAL PRIMARY KEY,
    predecessor_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    successor_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    dependency_type VARCHAR(10) DEFAULT 'FS'
);

-- -------------------------------------------------------
-- project_requests: create table if not exists
-- -------------------------------------------------------
-- -------------------------------------------------------
-- resources: create table if not exists (G1)
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS resources (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP,
    folio VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    position VARCHAR(255),
    department VARCHAR(255),
    location VARCHAR(255),
    phone VARCHAR(50),
    mobile_phone VARCHAR(50),
    company_name VARCHAR(255),
    resource_type VARCHAR(50) DEFAULT 'human',
    is_internal BOOLEAN DEFAULT TRUE,
    is_active BOOLEAN DEFAULT TRUE,
    hourly_rate FLOAT DEFAULT 0,
    cost_period VARCHAR(20) DEFAULT 'hour',
    hours_worked FLOAT DEFAULT 0,
    user_id INTEGER REFERENCES users(id),
    organization_id INTEGER REFERENCES organizations(id),
    created_by_id INTEGER REFERENCES users(id)
);

-- -------------------------------------------------------
-- project_resources: pivot table (G1)
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS project_resources (
    project_id INTEGER NOT NULL REFERENCES projects(id),
    resource_id INTEGER NOT NULL REFERENCES resources(id),
    allocation FLOAT DEFAULT 100,
    role VARCHAR(100),
    PRIMARY KEY (project_id, resource_id)
);

-- -------------------------------------------------------
-- resource_work_logs: time tracking (G2)
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS resource_work_logs (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP,
    resource_id INTEGER NOT NULL REFERENCES resources(id),
    project_id INTEGER REFERENCES projects(id),
    task_id INTEGER REFERENCES tasks(id),
    work_date DATE NOT NULL,
    hours FLOAT NOT NULL,
    notes TEXT,
    created_by_id INTEGER REFERENCES users(id)
);

-- -------------------------------------------------------
-- resource_availabilities: availability (G3)
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS resource_availabilities (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP,
    resource_id INTEGER NOT NULL REFERENCES resources(id),
    available_date DATE NOT NULL,
    available_hours FLOAT NOT NULL,
    notes TEXT
);

-- -------------------------------------------------------
-- project_statuses: periodic snapshots (G4)
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS project_statuses (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP,
    project_id INTEGER NOT NULL REFERENCES projects(id),
    status_date DATE NOT NULL,
    health VARCHAR(20) NOT NULL,
    progress_plan FLOAT DEFAULT 0,
    progress_actual FLOAT DEFAULT 0,
    summary TEXT,
    risks_summary TEXT,
    blockers TEXT,
    next_steps TEXT,
    created_by_id INTEGER REFERENCES users(id)
);

-- -------------------------------------------------------
-- project_closures: formal closure (G5)
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS project_closures (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP,
    project_id INTEGER NOT NULL REFERENCES projects(id) UNIQUE,
    closure_date DATE NOT NULL,
    summary TEXT NOT NULL,
    outcomes TEXT,
    pending_actions TEXT,
    approved_by VARCHAR(255),
    approved_by_id INTEGER REFERENCES users(id),
    status VARCHAR(50) DEFAULT 'draft',
    comments TEXT,
    created_by_id INTEGER REFERENCES users(id)
);

-- -------------------------------------------------------
-- dashboard_share_links: shared dashboards (G6)
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS dashboard_share_links (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP,
    organization_id INTEGER NOT NULL REFERENCES organizations(id),
    created_by_user_id INTEGER NOT NULL REFERENCES users(id),
    label VARCHAR(255) NOT NULL,
    token VARCHAR(128) UNIQUE NOT NULL,
    pin_hash VARCHAR(255),
    expires_at TIMESTAMP,
    last_accessed_at TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

-- -------------------------------------------------------
-- approval_logs: polymorphic approval history (G13)
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS approval_logs (
    id SERIAL PRIMARY KEY,
    approvable_type VARCHAR(100) NOT NULL,
    approvable_id INTEGER NOT NULL,
    approved_by_user_id INTEGER NOT NULL REFERENCES users(id),
    status VARCHAR(50) NOT NULL,
    comments TEXT,
    approved_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------
-- project_requests: create table if not exists
-- -------------------------------------------------------
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
