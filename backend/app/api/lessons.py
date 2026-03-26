from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.modules import Lesson
from app.schemas.lesson import LessonCreate, LessonUpdate, LessonResponse
from app.auth.security import get_current_user
from app.services.folio import generate_folio

router = APIRouter(prefix="/lessons", tags=["Lessons"])


@router.get("", response_model=list[LessonResponse])
def list_lessons(
    project_id: int | None = None,
    category: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Lesson).filter(Lesson.deleted_at.is_(None))
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
):
    folio = generate_folio(db, "LEC")
    lesson = Lesson(
        folio=folio,
        title=data.title,
        description=data.description,
        category=data.category,
        project_phase=data.project_phase,
        recommendation=data.recommendation,
        project_id=project_id,
        recorded_by_id=current_user.id,
        created_by_id=current_user.id,
    )
    db.add(lesson)
    db.commit()
    db.refresh(lesson)
    return lesson


@router.patch("/{lesson_id}", response_model=LessonResponse)
def update_lesson(lesson_id: int, data: LessonUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    lesson = db.query(Lesson).filter(Lesson.id == lesson_id, Lesson.deleted_at.is_(None)).first()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lección no encontrada")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(lesson, field, value)
    db.commit()
    db.refresh(lesson)
    return lesson


@router.delete("/{lesson_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_lesson(lesson_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    lesson = db.query(Lesson).filter(Lesson.id == lesson_id, Lesson.deleted_at.is_(None)).first()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lección no encontrada")
    from datetime import datetime
    lesson.deleted_at = datetime.utcnow()
    db.commit()
