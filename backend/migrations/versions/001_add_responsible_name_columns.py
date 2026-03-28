"""Add responsible_name columns to tasks and project_areas

Revision ID: 001
Revises:
Create Date: 2026-03-28
"""
from alembic import op
import sqlalchemy as sa

revision = '001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add responsible_name to tasks table
    op.add_column('tasks', sa.Column('responsible_name', sa.String(255), nullable=True))
    # Add responsible_name_text to project_areas table
    op.add_column('project_areas', sa.Column('responsible_name_text', sa.String(255), nullable=True))


def downgrade() -> None:
    op.drop_column('tasks', 'responsible_name')
    op.drop_column('project_areas', 'responsible_name_text')
