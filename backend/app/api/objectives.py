from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.organization import Organization
from app.models.objective import ProjectObjective
from app.schemas.objective import ObjectiveCreate, ObjectiveUpdate, ObjectiveResponse
from app.auth.security import get_current_user
from app.dependencies import get_current_tenant
from app.utils.tenant_query import verify_project_tenant
from app.utils.crud_helpers import soft_delete

router = APIRouter(prefix="/projects/{project_id}/objectives", tags=["Project Objectives"])


@router.get("", response_model=list[ObjectiveResponse])
def list_objectives(project_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user), tenant: Organization = Depends(get_current_tenant)):
    verify_project_tenant(db, project_id, tenant)
    return db.query(ProjectObjective).filter(
        ProjectObjective.project_id == project_id,
        ProjectObjective.deleted_at.is_(None)
    ).all()


@router.post("", response_model=ObjectiveResponse, status_code=status.HTTP_201_CREATED)
def create_objective(project_id: int, data: ObjectiveCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user), tenant: Organization = Depends(get_current_tenant)):
    verify_project_tenant(db, project_id, tenant)
    obj = ProjectObjective(
        description=data.description,
        type=data.type,
        target_value=data.target_value,
        current_value=data.current_value,
        project_id=project_id,
        organization_id=tenant.id,
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.patch("/{objective_id}", response_model=ObjectiveResponse)
def update_objective(project_id: int, objective_id: int, data: ObjectiveUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    obj = db.query(ProjectObjective).filter(
        ProjectObjective.id == objective_id,
        ProjectObjective.project_id == project_id,
        ProjectObjective.deleted_at.is_(None)
    ).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Objetivo no encontrado")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(obj, field, value)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete("/{objective_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_objective(project_id: int, objective_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    obj = db.query(ProjectObjective).filter(
        ProjectObjective.id == objective_id,
        ProjectObjective.project_id == project_id,
        ProjectObjective.deleted_at.is_(None)
    ).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Objetivo no encontrado")
    soft_delete(db, obj)
