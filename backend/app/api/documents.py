from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.modules import Document
from app.schemas.document import DocumentCreate, DocumentUpdate, DocumentResponse
from app.auth.security import get_current_user
from app.services.folio import generate_folio
from app.services import notifications as notif_svc

router = APIRouter(prefix="/documents", tags=["Documents"])


@router.get("", response_model=list[DocumentResponse])
def list_documents(
    project_id: int | None = None,
    category: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Document).filter(Document.deleted_at.is_(None))
    if project_id:
        query = query.filter(Document.project_id == project_id)
    if category:
        query = query.filter(Document.category == category)
    return query.order_by(Document.created_at.desc()).all()


@router.post("", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
def create_document(
    project_id: int,
    data: DocumentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    folio = generate_folio(db, "DOC")
    doc = Document(
        folio=folio,
        name=data.name,
        description=data.description,
        category=data.category,
        file_path=data.file_path,
        file_type=data.file_type,
        file_size=data.file_size,
        project_id=project_id,
        uploaded_by_id=current_user.id,
        created_by_id=current_user.id,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    notif_svc.on_document_uploaded(db, doc, project_id, current_user.id)
    db.commit()
    return doc


@router.patch("/{document_id}", response_model=DocumentResponse)
def update_document(document_id: int, data: DocumentUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    doc = db.query(Document).filter(Document.id == document_id, Document.deleted_at.is_(None)).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Documento no encontrado")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(doc, field, value)
    db.commit()
    db.refresh(doc)
    return doc


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_document(document_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    doc = db.query(Document).filter(Document.id == document_id, Document.deleted_at.is_(None)).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Documento no encontrado")
    from datetime import datetime, timezone
    doc.deleted_at = datetime.now(timezone.utc)
    db.commit()
