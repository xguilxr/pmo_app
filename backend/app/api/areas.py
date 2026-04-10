import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.project import Project
from app.models.area import ProjectArea
from app.schemas.area import AreaCreate, AreaUpdate, AreaResponse
from app.auth.security import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/projects/{project_id}/areas", tags=["Project Areas"])


@router.get("", response_model=list[AreaResponse])
def list_areas(project_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    project = db.query(Project).filter(Project.id == project_id, Project.deleted_at.is_(None)).first()
    if not project:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")
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
def create_area(project_id: int, data: AreaCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    project = db.query(Project).filter(Project.id == project_id, Project.deleted_at.is_(None)).first()
    if not project:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")
    try:
        area = ProjectArea(
            name=data.name,
            description=data.description,
            role_in_project=data.role_in_project,
            responsible_name_text=data.responsible_name,
            project_id=project_id,
            responsible_id=data.responsible_id,
        )
        db.add(area)
        db.commit()
        db.refresh(area)
    except Exception as exc:
        db.rollback()
        logger.exception("Failed to create project area for project_id=%s", project_id)
        raise HTTPException(status_code=500, detail=f"Error al crear el área: {exc}")
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
    from datetime import datetime, timezone
    area.deleted_at = datetime.now(timezone.utc)
    db.commit()
