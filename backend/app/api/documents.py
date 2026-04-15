from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.organization import Organization
from app.models.modules import Document
from app.schemas.document import DocumentCreate, DocumentUpdate, DocumentResponse
from app.auth.security import get_current_user
from app.dependencies import get_current_tenant
from app.utils.tenant_query import verify_project_tenant
from app.utils.crud_helpers import get_or_404, apply_update, soft_delete
from app.services.folio import generate_folio
from app.services import notifications as notif_svc

router = APIRouter(prefix="/documents", tags=["Documents"])


@router.get("", response_model=list[DocumentResponse])
def list_documents(
    project_id: int | None = None,
    category: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    tenant: Organization = Depends(get_current_tenant),
):
    query = db.query(Document).filter(Document.deleted_at.is_(None), Document.organization_id == tenant.id)
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
    tenant: Organization = Depends(get_current_tenant),
):
    verify_project_tenant(db, project_id, tenant)
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
        organization_id=tenant.id,
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
    doc = get_or_404(db, Document, document_id, detail="Documento no encontrado")
    apply_update(db, doc, data)
    return doc


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_document(document_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    soft_delete(db, get_or_404(db, Document, document_id, detail="Documento no encontrado"))
