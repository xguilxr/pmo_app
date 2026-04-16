from pydantic import BaseModel
from datetime import date, datetime


class ProjectCreate(BaseModel):
    name: str
    description: str | None = None
    type: str | None = None
    priority: str | None = None
    organization_id: int
    program_id: int | None = None
    start_date: date | None = None
    end_date: date | None = None
    budget: float = 0
    request_id: int | None = None


class ProjectUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    type: str | None = None
    priority: str | None = None
    phase: str | None = None
    health: str | None = None
    start_date: date | None = None
    end_date: date | None = None
    budget: float | None = None
    real_budget: float | None = None
    progress: float | None = None
    planned_progress: float | None = None
    organization_id: int | None = None
    program_id: int | None = None


class ProjectResponse(BaseModel):
    id: int
    folio: str
    name: str
    description: str | None
    type: str | None
    priority: str | None
    phase: str
    status: str
    health: str
    start_date: date | None
    end_date: date | None
    budget: float
    real_budget: float
    progress: float
    planned_progress: float
    organization_id: int
    program_id: int | None
    organization_name: str | None = None
    program_name: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class ProjectListResponse(BaseModel):
    id: int
    folio: str
    name: str
    type: str | None
    priority: str | None
    company: str             # organization name
    phase: str
    progress: float
    planned_progress: float
    budget: float
    health: str
    start_date: date | None = None
    end_date: date | None = None
    program_id: int | None = None
    program_name: str | None = None


class DashboardKPIs(BaseModel):
    active_projects: int
    requests_in_review: int
    open_risks: int
    changes_in_review: int
    total_budget: float
    avg_progress: float
    severe_risks: int
    open_aids: int
    # Enhanced metrics (G14)
    total_real_budget: float = 0
    budget_variance: float = 0
    projects_by_phase: dict[str, int] = {}
    projects_by_health: dict[str, int] = {}
    total_resources: int = 0
    projects_by_type: dict[str, int] = {}
    top_projects_by_progress: list[dict[str, str | float]] = []
