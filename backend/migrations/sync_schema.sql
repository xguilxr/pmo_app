-- Comprehensive schema sync: run this against the database
-- to add all missing columns and tables that SQLAlchemy models define.
-- Compatible with MySQL 8.0+ / MariaDB 10.3+.

-- -------------------------------------------------------
-- organizations: multi-tenant fields
-- -------------------------------------------------------
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS slug VARCHAR(100) UNIQUE;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS domain VARCHAR(255) UNIQUE;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS primary_color VARCHAR(7) DEFAULT '#3B82F6';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS secondary_color VARCHAR(7) DEFAULT '#6366F1';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS config_json JSON;

-- -------------------------------------------------------
-- Add organization_id to all tenant-scoped tables
-- -------------------------------------------------------
ALTER TABLE risks ADD COLUMN IF NOT EXISTS organization_id INTEGER;
ALTER TABLE issues ADD COLUMN IF NOT EXISTS organization_id INTEGER;
ALTER TABLE changes ADD COLUMN IF NOT EXISTS organization_id INTEGER;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS organization_id INTEGER;
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS organization_id INTEGER;
ALTER TABLE minutes ADD COLUMN IF NOT EXISTS organization_id INTEGER;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS organization_id INTEGER;
ALTER TABLE backlog_items ADD COLUMN IF NOT EXISTS organization_id INTEGER;
ALTER TABLE project_areas ADD COLUMN IF NOT EXISTS organization_id INTEGER;
ALTER TABLE project_objectives ADD COLUMN IF NOT EXISTS organization_id INTEGER;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS organization_id INTEGER;
ALTER TABLE progress_reports ADD COLUMN IF NOT EXISTS organization_id INTEGER;
ALTER TABLE project_statuses ADD COLUMN IF NOT EXISTS organization_id INTEGER;
ALTER TABLE project_closures ADD COLUMN IF NOT EXISTS organization_id INTEGER;
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS organization_id INTEGER;
ALTER TABLE approval_logs ADD COLUMN IF NOT EXISTS organization_id INTEGER;

-- -------------------------------------------------------
-- users: super admin flag
-- -------------------------------------------------------
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_superadmin BOOLEAN DEFAULT FALSE;

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
ALTER TABLE project_areas ADD COLUMN IF NOT EXISTS responsible_id INTEGER;

-- -------------------------------------------------------
-- risks / issues: ensure responsible_id column exists
-- -------------------------------------------------------
ALTER TABLE risks ADD COLUMN IF NOT EXISTS responsible_id INTEGER;
ALTER TABLE issues ADD COLUMN IF NOT EXISTS responsible_id INTEGER;

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
    id INTEGER NOT NULL AUTO_INCREMENT PRIMARY KEY,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    title VARCHAR(255) NOT NULL,
    content_html TEXT NOT NULL,
    period_start DATE,
    period_end DATE,
    status VARCHAR(50) DEFAULT 'draft',
    recipients TEXT,
    sent_date DATE,
    ai_model_used VARCHAR(100),
    ai_generation_time_ms INTEGER,
    project_id INTEGER NOT NULL,
    generated_by_id INTEGER,
    created_by_id INTEGER,
    organization_id INTEGER
);

-- -------------------------------------------------------
-- project_objectives: create table if not exists
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS project_objectives (
    id INTEGER NOT NULL AUTO_INCREMENT PRIMARY KEY,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    description TEXT NOT NULL,
    type VARCHAR(50) NOT NULL,
    target_value VARCHAR(255),
    current_value VARCHAR(255),
    progress FLOAT DEFAULT 0,
    status VARCHAR(50) DEFAULT 'pending',
    project_id INTEGER NOT NULL
);

-- -------------------------------------------------------
-- task_dependencies: create table if not exists
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS task_dependencies (
    id INTEGER NOT NULL AUTO_INCREMENT PRIMARY KEY,
    predecessor_id INTEGER NOT NULL,
    successor_id INTEGER NOT NULL,
    dependency_type VARCHAR(10) DEFAULT 'FS'
);

-- -------------------------------------------------------
-- resources: create table if not exists
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS resources (
    id INTEGER NOT NULL AUTO_INCREMENT PRIMARY KEY,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
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
    user_id INTEGER,
    organization_id INTEGER,
    created_by_id INTEGER
);

-- -------------------------------------------------------
-- project_resources: pivot table
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS project_resources (
    project_id INTEGER NOT NULL,
    resource_id INTEGER NOT NULL,
    allocation FLOAT DEFAULT 100,
    role VARCHAR(100),
    PRIMARY KEY (project_id, resource_id)
);

-- -------------------------------------------------------
-- resource_work_logs: time tracking
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS resource_work_logs (
    id INTEGER NOT NULL AUTO_INCREMENT PRIMARY KEY,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    resource_id INTEGER NOT NULL,
    project_id INTEGER,
    task_id INTEGER,
    work_date DATE NOT NULL,
    hours FLOAT NOT NULL,
    notes TEXT,
    created_by_id INTEGER
);

-- -------------------------------------------------------
-- resource_availabilities: availability
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS resource_availabilities (
    id INTEGER NOT NULL AUTO_INCREMENT PRIMARY KEY,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    resource_id INTEGER NOT NULL,
    available_date DATE NOT NULL,
    available_hours FLOAT NOT NULL,
    notes TEXT
);

-- -------------------------------------------------------
-- project_statuses: periodic snapshots
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS project_statuses (
    id INTEGER NOT NULL AUTO_INCREMENT PRIMARY KEY,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    project_id INTEGER NOT NULL,
    status_date DATE NOT NULL,
    health VARCHAR(20) NOT NULL,
    progress_plan FLOAT DEFAULT 0,
    progress_actual FLOAT DEFAULT 0,
    summary TEXT,
    risks_summary TEXT,
    blockers TEXT,
    next_steps TEXT,
    created_by_id INTEGER,
    organization_id INTEGER
);

-- -------------------------------------------------------
-- project_closures: formal closure
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS project_closures (
    id INTEGER NOT NULL AUTO_INCREMENT PRIMARY KEY,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    project_id INTEGER NOT NULL,
    closure_date DATE NOT NULL,
    summary TEXT NOT NULL,
    outcomes TEXT,
    pending_actions TEXT,
    approved_by VARCHAR(255),
    approved_by_id INTEGER,
    status VARCHAR(50) DEFAULT 'draft',
    comments TEXT,
    created_by_id INTEGER,
    organization_id INTEGER
);

-- -------------------------------------------------------
-- dashboard_share_links: shared dashboards
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS dashboard_share_links (
    id INTEGER NOT NULL AUTO_INCREMENT PRIMARY KEY,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    organization_id INTEGER NOT NULL,
    created_by_user_id INTEGER NOT NULL,
    label VARCHAR(255) NOT NULL,
    token VARCHAR(128) UNIQUE NOT NULL,
    pin_hash VARCHAR(255),
    expires_at TIMESTAMP NULL,
    last_accessed_at TIMESTAMP NULL,
    is_active BOOLEAN DEFAULT TRUE
);

-- -------------------------------------------------------
-- approval_logs: polymorphic approval history
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS approval_logs (
    id INTEGER NOT NULL AUTO_INCREMENT PRIMARY KEY,
    approvable_type VARCHAR(100) NOT NULL,
    approvable_id INTEGER NOT NULL,
    approved_by_user_id INTEGER NOT NULL,
    status VARCHAR(50) NOT NULL,
    comments TEXT,
    approved_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    organization_id INTEGER
);

-- -------------------------------------------------------
-- project_requests: create table if not exists
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS project_requests (
    id INTEGER NOT NULL AUTO_INCREMENT PRIMARY KEY,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
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
    reviewed_by_id INTEGER,
    review_date DATE,
    rejection_reason TEXT,
    organization_id INTEGER,
    requester_id INTEGER,
    created_by_id INTEGER
);
