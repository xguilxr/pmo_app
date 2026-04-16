from datetime import date, datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.project import Project
from app.models.organization import Organization
from app.models.task import Task
from app.models.modules import Risk, Issue, Change, Document, Lesson, Minute
from app.models.backlog import BacklogItem
from app.models.area import ProjectArea
from app.models.objective import ProjectObjective
from app.schemas.project import ProjectCreate, ProjectUpdate, ProjectResponse, ProjectListResponse
from app.auth.security import get_current_user
from app.dependencies import get_current_tenant
from app.services.folio import generate_folio
from app.services import notifications as notif_svc


def _project_to_response(p: Project) -> ProjectResponse:
    """Build ProjectResponse with organization/program names resolved."""
    return ProjectResponse(
        id=p.id, folio=p.folio, name=p.name, description=p.description,
        type=p.type, priority=p.priority, phase=p.phase, status=p.status,
        health=p.health, start_date=p.start_date, end_date=p.end_date,
        budget=p.budget, real_budget=p.real_budget, progress=p.progress,
        planned_progress=p.planned_progress, organization_id=p.organization_id,
        program_id=p.program_id, created_at=p.created_at,
        organization_name=p.organization.name if p.organization else None,
        program_name=p.program.name if p.program else None,
    )

router = APIRouter(prefix="/projects", tags=["Projects"])


@router.get("", response_model=list[ProjectListResponse])
def list_projects(
    phase: str | None = None,
    company: str | None = None,
    folio: str | None = None,
    name: str | None = None,
    type: str | None = None,
    priority: str | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    program_id: int | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    tenant: Organization = Depends(get_current_tenant),
):
    query = db.query(Project).join(Organization).filter(
        Project.deleted_at.is_(None),
        Project.organization_id == tenant.id,
    )

    if phase and phase != "Todos":
        query = query.filter(Project.phase == phase)
    if company:
        query = query.filter(Organization.name == company)
    if folio:
        query = query.filter(Project.folio.ilike(f"%{folio}%"))
    if name:
        query = query.filter(Project.name.ilike(f"%{name}%"))
    if type:
        query = query.filter(Project.type == type)
    if priority:
        query = query.filter(Project.priority == priority)
    if date_from:
        query = query.filter(Project.start_date >= date_from)
    if date_to:
        query = query.filter(Project.start_date <= date_to)
    if program_id:
        query = query.filter(Project.program_id == program_id)

    projects = query.order_by(Project.name.asc()).all()
    return [
        ProjectListResponse(
            id=p.id, folio=p.folio, name=p.name, type=p.type, priority=p.priority,
            company=p.organization.name, phase=p.phase, progress=p.progress,
            planned_progress=p.planned_progress, budget=p.budget, health=p.health,
            start_date=p.start_date, end_date=p.end_date, program_id=p.program_id,
            program_name=p.program.name if p.program else None,
        )
        for p in projects
    ]


@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
def create_project(
    data: ProjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    tenant: Organization = Depends(get_current_tenant),
):
    folio = generate_folio(db, "PRJ")
    project = Project(
        folio=folio,
        name=data.name,
        description=data.description,
        type=data.type,
        priority=data.priority,
        organization_id=tenant.id,
        program_id=data.program_id,
        start_date=data.start_date,
        end_date=data.end_date,
        budget=data.budget,
        request_id=data.request_id,
        pm_id=current_user.id,
        created_by_id=current_user.id,
    )
    project.users.append(current_user)
    db.add(project)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Error de integridad al crear el proyecto")
    db.refresh(project)
    notif_svc.on_project_created(db, project, current_user.id)
    db.commit()
    return _project_to_response(project)


@router.get("/{project_id}", response_model=ProjectResponse)
def get_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    tenant: Organization = Depends(get_current_tenant),
):
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.organization_id == tenant.id,
        Project.deleted_at.is_(None),
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")
    return _project_to_response(project)


@router.patch("/{project_id}", response_model=ProjectResponse)
def update_project(
    project_id: int,
    data: ProjectUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    tenant: Organization = Depends(get_current_tenant),
):
    project = db.query(Project).filter(
        Project.id == project_id, Project.organization_id == tenant.id, Project.deleted_at.is_(None),
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")

    old_phase = project.phase
    old_health = project.health
    update_data = data.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(project, field, value)

    db.commit()
    db.refresh(project)

    # Notifications for significant changes
    if "phase" in update_data and project.phase != old_phase:
        notif_svc.on_project_phase_changed(db, project, old_phase, current_user.id)
        db.commit()
    if "health" in update_data and project.health != old_health:
        notif_svc.on_project_health_changed(db, project, old_health, current_user.id)
        db.commit()

    return _project_to_response(project)


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    tenant: Organization = Depends(get_current_tenant),
):
    project = db.query(Project).filter(
        Project.id == project_id, Project.organization_id == tenant.id, Project.deleted_at.is_(None),
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")

    now = datetime.now(timezone.utc)

    # Cascade soft-delete all child records
    for model in (Task, Risk, Issue, Change, Document, Lesson, Minute, BacklogItem, ProjectArea, ProjectObjective):
        db.query(model).filter(
            model.project_id == project_id, model.deleted_at.is_(None)
        ).update({"deleted_at": now}, synchronize_session=False)

    project.deleted_at = now
    db.commit()
