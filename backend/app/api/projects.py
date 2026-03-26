from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.project import Project
from app.models.organization import Organization
from app.schemas.project import ProjectCreate, ProjectUpdate, ProjectResponse, ProjectListResponse
from app.auth.security import get_current_user
from app.services.folio import generate_folio

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
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Project).join(Organization).filter(Project.deleted_at.is_(None))

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

    projects = query.all()
    return [
        ProjectListResponse(
            id=p.id, folio=p.folio, name=p.name, type=p.type, priority=p.priority,
            company=p.organization.name, phase=p.phase, progress=p.progress,
            planned_progress=p.planned_progress, budget=p.budget, health=p.health,
        )
        for p in projects
    ]


@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
def create_project(data: ProjectCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    folio = generate_folio(db, "PRJ")
    project = Project(
        folio=folio,
        name=data.name,
        description=data.description,
        type=data.type,
        priority=data.priority,
        organization_id=data.organization_id,
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
    db.commit()
    db.refresh(project)
    return project


@router.get("/{project_id}", response_model=ProjectResponse)
def get_project(project_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    project = db.query(Project).filter(Project.id == project_id, Project.deleted_at.is_(None)).first()
    if not project:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")
    return project


@router.patch("/{project_id}", response_model=ProjectResponse)
def update_project(project_id: int, data: ProjectUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    project = db.query(Project).filter(Project.id == project_id, Project.deleted_at.is_(None)).first()
    if not project:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(project, field, value)

    db.commit()
    db.refresh(project)
    return project
