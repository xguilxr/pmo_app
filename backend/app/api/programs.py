from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.program import Program
from app.models.organization import Organization
from app.schemas.program import ProgramCreate, ProgramUpdate, ProgramResponse, ProgramDetailResponse
from app.auth.security import get_current_user

router = APIRouter(prefix="/programs", tags=["Programs"])


@router.get("", response_model=list[ProgramResponse])
def list_programs(
    organization_id: int | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Program).filter(Program.deleted_at.is_(None))
    if organization_id:
        query = query.filter(Program.organization_id == organization_id)
    programs = query.order_by(Program.created_at.desc()).all()
    return [
        ProgramResponse(
            id=p.id, name=p.name, description=p.description, status=p.status,
            start_date=p.start_date, end_date=p.end_date,
            organization_id=p.organization_id, responsible_id=p.responsible_id,
            created_at=p.created_at,
            project_count=len([proj for proj in p.projects if proj.deleted_at is None]),
        )
        for p in programs
    ]


@router.get("/{program_id}", response_model=ProgramDetailResponse)
def get_program(program_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    program = db.query(Program).filter(Program.id == program_id, Program.deleted_at.is_(None)).first()
    if not program:
        raise HTTPException(status_code=404, detail="Programa no encontrado")
    return ProgramDetailResponse(
        id=program.id, name=program.name, description=program.description, status=program.status,
        start_date=program.start_date, end_date=program.end_date,
        organization_id=program.organization_id, responsible_id=program.responsible_id,
        created_at=program.created_at,
        project_count=len([p for p in program.projects if p.deleted_at is None]),
        organization_name=program.organization.name if program.organization else "",
    )


@router.post("", response_model=ProgramResponse, status_code=status.HTTP_201_CREATED)
def create_program(data: ProgramCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
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
def update_program(program_id: int, data: ProgramUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    program = db.query(Program).filter(Program.id == program_id, Program.deleted_at.is_(None)).first()
    if not program:
        raise HTTPException(status_code=404, detail="Programa no encontrado")
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
def delete_program(program_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    program = db.query(Program).filter(Program.id == program_id, Program.deleted_at.is_(None)).first()
    if not program:
        raise HTTPException(status_code=404, detail="Programa no encontrado")
    program.deleted_at = datetime.now(timezone.utc)
    db.commit()
