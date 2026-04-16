from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.organization import Organization
from app.models.area import ProjectArea
from app.schemas.area import AreaCreate, AreaUpdate, AreaResponse
from app.auth.security import get_current_user
from app.dependencies import get_current_tenant
from app.utils.tenant_query import verify_project_tenant
from app.utils.crud_helpers import soft_delete

router = APIRouter(prefix="/projects/{project_id}/areas", tags=["Project Areas"])


@router.get("", response_model=list[AreaResponse])
def list_areas(project_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user), tenant: Organization = Depends(get_current_tenant)):
    verify_project_tenant(db, project_id, tenant)
    areas = db.query(ProjectArea).filter(
        ProjectArea.project_id == project_id,
        ProjectArea.deleted_at.is_(None)
    ).all()
    result = []
    for a in areas:
        resp = AreaResponse.model_validate(a)
        if a.responsible:
            resp.responsible_name = a.responsible.full_name
        elif a.responsible_name_text:
            resp.responsible_name = a.responsible_name_text
        result.append(resp)
    return result


@router.post("", response_model=AreaResponse, status_code=status.HTTP_201_CREATED)
def create_area(project_id: int, data: AreaCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user), tenant: Organization = Depends(get_current_tenant)):
    verify_project_tenant(db, project_id, tenant)
    area = ProjectArea(
        name=data.name,
        description=data.description,
        role_in_project=data.role_in_project,
        responsible_name_text=data.responsible_name,
        project_id=project_id,
        organization_id=tenant.id,
        responsible_id=data.responsible_id,
    )
    db.add(area)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Error de integridad al crear el área")
    db.refresh(area)
    resp = AreaResponse.model_validate(area)
    if area.responsible:
        resp.responsible_name = area.responsible.full_name
    elif area.responsible_name_text:
        resp.responsible_name = area.responsible_name_text
    return resp


@router.patch("/{area_id}", response_model=AreaResponse)
def update_area(project_id: int, area_id: int, data: AreaUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    area = db.query(ProjectArea).filter(
        ProjectArea.id == area_id,
        ProjectArea.project_id == project_id,
        ProjectArea.deleted_at.is_(None)
    ).first()
    if not area:
        raise HTTPException(status_code=404, detail="Área no encontrada")
    updates = data.model_dump(exclude_unset=True)
    # Map responsible_name to the model column
    if "responsible_name" in updates:
        area.responsible_name_text = updates.pop("responsible_name")
    for field, value in updates.items():
        setattr(area, field, value)
    db.commit()
    db.refresh(area)
    resp = AreaResponse.model_validate(area)
    if area.responsible:
        resp.responsible_name = area.responsible.full_name
    elif area.responsible_name_text:
        resp.responsible_name = area.responsible_name_text
    return resp


@router.delete("/{area_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_area(project_id: int, area_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    area = db.query(ProjectArea).filter(
        ProjectArea.id == area_id,
        ProjectArea.project_id == project_id,
        ProjectArea.deleted_at.is_(None)
    ).first()
    if not area:
        raise HTTPException(status_code=404, detail="Área no encontrada")
    soft_delete(db, area)
