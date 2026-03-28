"""Comprehensive schema sync - add all missing columns and tables

Revision ID: 002
Revises: 001
Create Date: 2026-03-28
"""
from alembic import op
import sqlalchemy as sa

revision = '002'
down_revision = '001'
branch_labels = None
depends_on = None


def _column_exists(table: str, column: str) -> bool:
    """Check if a column already exists in a table."""
    conn = op.get_bind()
    result = conn.execute(sa.text(
        "SELECT 1 FROM information_schema.columns "
        "WHERE table_name = :table AND column_name = :column"
    ), {"table": table, "column": column})
    return result.fetchone() is not None


def _table_exists(table: str) -> bool:
    """Check if a table already exists."""
    conn = op.get_bind()
    result = conn.execute(sa.text(
        "SELECT 1 FROM information_schema.tables "
        "WHERE table_name = :table AND table_schema = 'public'"
    ), {"table": table})
    return result.fetchone() is not None


def upgrade() -> None:
    # ── tasks table: add missing columns ──
    tasks_columns = [
        ("notes", sa.Text(), None),
        ("source", sa.String(50), "manual"),
        ("responsible_name", sa.String(255), None),
        ("was_delayed", sa.Boolean(), False),
        ("original_end_date", sa.Date(), None),
    ]
    for col_name, col_type, default in tasks_columns:
        if not _column_exists("tasks", col_name):
            col = sa.Column(col_name, col_type, nullable=True, server_default=str(default) if default is not None else None)
            op.add_column("tasks", col)

    # ── project_areas table: add missing columns ──
    if not _column_exists("project_areas", "responsible_name_text"):
        op.add_column("project_areas", sa.Column("responsible_name_text", sa.String(255), nullable=True))

    # ── backlog_items table: add missing columns ──
    backlog_columns = [
        ("was_delayed", sa.Boolean(), False),
        ("original_end_date", sa.Date(), None),
    ]
    for col_name, col_type, default in backlog_columns:
        if not _column_exists("backlog_items", col_name):
            col = sa.Column(col_name, col_type, nullable=True, server_default=str(default) if default is not None else None)
            op.add_column("backlog_items", col)

    # ── progress_reports table: create if not exists ──
    if not _table_exists("progress_reports"):
        op.create_table(
            "progress_reports",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
            sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
            sa.Column("deleted_at", sa.DateTime(), nullable=True),
            sa.Column("title", sa.String(255), nullable=False),
            sa.Column("content_html", sa.Text(), nullable=False),
            sa.Column("period_start", sa.Date(), nullable=True),
            sa.Column("period_end", sa.Date(), nullable=True),
            sa.Column("status", sa.String(50), server_default="draft"),
            sa.Column("recipients", sa.Text(), nullable=True),
            sa.Column("sent_date", sa.Date(), nullable=True),
            sa.Column("ai_model_used", sa.String(100), nullable=True),
            sa.Column("ai_generation_time_ms", sa.Integer(), nullable=True),
            sa.Column("project_id", sa.Integer(), sa.ForeignKey("projects.id"), nullable=False),
            sa.Column("generated_by_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
            sa.Column("created_by_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        )

    # ── project_objectives table: create if not exists ──
    if not _table_exists("project_objectives"):
        op.create_table(
            "project_objectives",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
            sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
            sa.Column("deleted_at", sa.DateTime(), nullable=True),
            sa.Column("description", sa.Text(), nullable=False),
            sa.Column("type", sa.String(50), nullable=False),
            sa.Column("target_value", sa.String(255), nullable=True),
            sa.Column("current_value", sa.String(255), nullable=True),
            sa.Column("progress", sa.Float(), server_default="0"),
            sa.Column("status", sa.String(50), server_default="pending"),
            sa.Column("project_id", sa.Integer(), sa.ForeignKey("projects.id"), nullable=False),
        )

    # ── task_dependencies table: create if not exists ──
    if not _table_exists("task_dependencies"):
        op.create_table(
            "task_dependencies",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("predecessor_id", sa.Integer(), sa.ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False),
            sa.Column("successor_id", sa.Integer(), sa.ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False),
            sa.Column("dependency_type", sa.String(10), server_default="FS"),
        )

    # ── minutes table: add AI columns if missing ──
    minutes_columns = [
        ("source", sa.String(50), "manual"),
        ("transcript_text", sa.Text(), None),
        ("ai_model_used", sa.String(100), None),
        ("ai_generation_time_ms", sa.Integer(), None),
    ]
    for col_name, col_type, default in minutes_columns:
        if not _column_exists("minutes", col_name):
            col = sa.Column(col_name, col_type, nullable=True, server_default=str(default) if default is not None else None)
            op.add_column("minutes", col)

    # ── project_requests table: create if not exists ──
    if not _table_exists("project_requests"):
        op.create_table(
            "project_requests",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
            sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
            sa.Column("deleted_at", sa.DateTime(), nullable=True),
            sa.Column("folio", sa.String(50), unique=True, nullable=False),
            sa.Column("status", sa.String(50), server_default="pending"),
            sa.Column("request_date", sa.Date(), nullable=True),
            sa.Column("requester_name", sa.String(255), nullable=True),
            sa.Column("requester_email", sa.String(255), nullable=True),
            sa.Column("title", sa.String(255), nullable=False),
            sa.Column("description", sa.Text(), nullable=True),
            sa.Column("objective", sa.Text(), nullable=True),
            sa.Column("business_unit", sa.String(255), nullable=True),
            sa.Column("department", sa.String(255), nullable=True),
            sa.Column("sub_department", sa.String(255), nullable=True),
            sa.Column("sponsor_name", sa.String(255), nullable=True),
            sa.Column("sponsor_email", sa.String(255), nullable=True),
            sa.Column("strategic_alignment", sa.Text(), nullable=True),
            sa.Column("benefits", sa.Text(), nullable=True),
            sa.Column("budget", sa.Float(), nullable=True),
            sa.Column("what_if_not_done", sa.Text(), nullable=True),
            sa.Column("key_stakeholders", sa.Text(), nullable=True),
            sa.Column("expected_deliverables", sa.Text(), nullable=True),
            sa.Column("observations", sa.Text(), nullable=True),
            sa.Column("reviewed_by_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
            sa.Column("review_date", sa.Date(), nullable=True),
            sa.Column("rejection_reason", sa.Text(), nullable=True),
            sa.Column("organization_id", sa.Integer(), sa.ForeignKey("organizations.id"), nullable=True),
            sa.Column("requester_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
            sa.Column("created_by_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        )


def downgrade() -> None:
    # Drop tables created in this migration
    for table in ("task_dependencies", "project_objectives", "progress_reports", "project_requests"):
        if _table_exists(table):
            op.drop_table(table)

    # Drop columns added in this migration
    for col in ("notes", "source", "was_delayed", "original_end_date"):
        if _column_exists("tasks", col):
            op.drop_column("tasks", col)

    for col in ("was_delayed", "original_end_date"):
        if _column_exists("backlog_items", col):
            op.drop_column("backlog_items", col)

    for col in ("source", "transcript_text", "ai_model_used", "ai_generation_time_ms"):
        if _column_exists("minutes", col):
            op.drop_column("minutes", col)
