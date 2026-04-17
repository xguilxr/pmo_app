from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.program import Program
from app.models.organization import Organization
from app.models.project import Project
from app.models.task import Task
from app.models.modules import Risk, Issue, Change, Document, Lesson, Minute
from app.models.backlog import BacklogItem
from app.models.area import ProjectArea
from app.models.objective import ProjectObjective
from app.schemas.program import ProgramCreate, ProgramUpdate, ProgramResponse, ProgramDetailResponse
from app.auth.security import get_current_user
from app.dependencies import get_current_tenant
from app.utils.crud_helpers import get_or_404

router = APIRouter(prefix="/programs", tags=["Programs"])


@router.get("", response_model=list[ProgramResponse])
def list_programs(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    tenant: Organization = Depends(get_current_tenant),
):
    programs = (
        db.query(Program)
        .filter(
            Program.deleted_at.is_(None),
            Program.organization_id == tenant.id,
        )
        .order_by(Program.name.asc())
        .all()
    )
    # Batch project counts in a single GROUP BY query to avoid iterating the
    # lazy relationship once per program (N+1 at ~100 rows = 100 queries).
    counts = dict(
        db.query(Project.program_id, func.count(Project.id))
        .filter(
            Project.organization_id == tenant.id,
            Project.deleted_at.is_(None),
            Project.program_id.isnot(None),
        )
        .group_by(Project.program_id)
        .all()
    )
    return [
        ProgramResponse(
            id=p.id, name=p.name, description=p.description, status=p.status,
            start_date=p.start_date, end_date=p.end_date,
            organization_id=p.organization_id, responsible_id=p.responsible_id,
            created_at=p.created_at,
            project_count=counts.get(p.id, 0),
        )
        for p in programs
    ]


def _get_program_for_tenant(db: Session, program_id: int, tenant: Organization) -> Program:
    program = (
        db.query(Program)
        .filter(
            Program.id == program_id,
            Program.organization_id == tenant.id,
            Program.deleted_at.is_(None),
        )
        .first()
    )
    if not program:
        raise HTTPException(status_code=404, detail="Programa no encontrado")
    return program


@router.get("/{program_id}", response_model=ProgramDetailResponse)
def get_program(
    program_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    tenant: Organization = Depends(get_current_tenant),
):
    program = _get_program_for_tenant(db, program_id, tenant)
    return ProgramDetailResponse(
        id=program.id, name=program.name, description=program.description, status=program.status,
        start_date=program.start_date, end_date=program.end_date,
        organization_id=program.organization_id, responsible_id=program.responsible_id,
        created_at=program.created_at,
        project_count=len([p for p in program.projects if p.deleted_at is None]),
        organization_name=program.organization.name if program.organization else "",
    )


@router.post("", response_model=ProgramResponse, status_code=status.HTTP_201_CREATED)
def create_program(
    data: ProgramCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    tenant: Organization = Depends(get_current_tenant),
):
    if data.organization_id != tenant.id and not current_user.is_superadmin:
        raise HTTPException(status_code=403, detail="No puedes crear programas en otra organizacion")
    org = db.query(Organization).filter(Organization.id == data.organization_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organización no encontrada")
    program = Program(
        name=data.name, description=data.description, status=data.status,
        start_date=data.start_date, end_date=data.end_date,
        organization_id=data.organization_id, responsible_id=data.responsible_id,
        created_by_id=current_user.id,
    )
    db.add(program)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Error al crear el programa")
    db.refresh(program)
    return ProgramResponse(
        id=program.id, name=program.name, description=program.description, status=program.status,
        start_date=program.start_date, end_date=program.end_date,
        organization_id=program.organization_id, responsible_id=program.responsible_id,
        created_at=program.created_at, project_count=0,
    )


@router.patch("/{program_id}", response_model=ProgramResponse)
def update_program(
    program_id: int,
    data: ProgramUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    tenant: Organization = Depends(get_current_tenant),
):
    program = _get_program_for_tenant(db, program_id, tenant)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(program, field, value)
    db.commit()
    db.refresh(program)
    return ProgramResponse(
        id=program.id, name=program.name, description=program.description, status=program.status,
        start_date=program.start_date, end_date=program.end_date,
        organization_id=program.organization_id, responsible_id=program.responsible_id,
        created_at=program.created_at,
        project_count=len([p for p in program.projects if p.deleted_at is None]),
    )


@router.delete("/{program_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_program(
    program_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    tenant: Organization = Depends(get_current_tenant),
):
    program = _get_program_for_tenant(db, program_id, tenant)

    now = datetime.now(timezone.utc)

    # Get projects belonging to this program
    project_ids = [
        p.id for p in db.query(Project.id).filter(
            Project.program_id == program_id, Project.deleted_at.is_(None)
        ).all()
    ]

    if project_ids:
        for model in (Task, Risk, Issue, Change, Document, Lesson, Minute, BacklogItem, ProjectArea, ProjectObjective):
            db.query(model).filter(
                model.project_id.in_(project_ids), model.deleted_at.is_(None)
            ).update({"deleted_at": now}, synchronize_session=False)

        db.query(Project).filter(Project.id.in_(project_ids)).update(
            {"deleted_at": now}, synchronize_session=False
        )

    program.deleted_at = now
    db.commit()
