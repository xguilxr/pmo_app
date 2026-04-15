from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.organization import Organization
from app.models.modules import Lesson
from app.schemas.lesson import LessonCreate, LessonUpdate, LessonResponse
from app.auth.security import get_current_user
from app.dependencies import get_current_tenant
from app.utils.tenant_query import verify_project_tenant
from app.utils.crud_helpers import get_or_404, apply_update, soft_delete
from app.services.folio import generate_folio

router = APIRouter(prefix="/lessons", tags=["Lessons"])


@router.get("", response_model=list[LessonResponse])
def list_lessons(
    project_id: int | None = None,
    category: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    tenant: Organization = Depends(get_current_tenant),
):
    query = db.query(Lesson).filter(Lesson.deleted_at.is_(None), Lesson.organization_id == tenant.id)
    if project_id:
        query = query.filter(Lesson.project_id == project_id)
    if category:
        query = query.filter(Lesson.category == category)
    return query.order_by(Lesson.created_at.desc()).all()


@router.post("", response_model=LessonResponse, status_code=status.HTTP_201_CREATED)
def create_lesson(
    project_id: int,
    data: LessonCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    tenant: Organization = Depends(get_current_tenant),
):
    verify_project_tenant(db, project_id, tenant)
    folio = generate_folio(db, "LEC")
    lesson = Lesson(
        folio=folio,
        title=data.title,
        description=data.description,
        category=data.category,
        project_phase=data.project_phase,
        recommendation=data.recommendation,
        project_id=project_id,
        organization_id=tenant.id,
        recorded_by_id=current_user.id,
        created_by_id=current_user.id,
    )
    db.add(lesson)
    db.commit()
    db.refresh(lesson)
    return lesson


@router.patch("/{lesson_id}", response_model=LessonResponse)
def update_lesson(lesson_id: int, data: LessonUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    lesson = get_or_404(db, Lesson, lesson_id, detail="Lección no encontrada")
    apply_update(db, lesson, data)
    return lesson


@router.delete("/{lesson_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_lesson(lesson_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    soft_delete(db, get_or_404(db, Lesson, lesson_id, detail="Lección no encontrada"))
