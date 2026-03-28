import os
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.auth.security import get_current_user

router = APIRouter(prefix="/uploads", tags=["Uploads"])

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads")

ALLOWED_EXTENSIONS = {
    '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
    '.txt', '.csv', '.png', '.jpg', '.jpeg', '.gif', '.svg',
    '.zip', '.rar', '.7z',
}
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB


@router.post("")
def upload_file(
    file: UploadFile = File(...),
    project_id: int = Form(None),
    category: str = Form("General"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No se proporcionó archivo")

    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Tipo de archivo no permitido: {ext}")

    # Read file content
    content = file.file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="El archivo excede el tamaño máximo de 50MB")

    # Create upload directory structure
    date_dir = datetime.now(timezone.utc).strftime("%Y/%m")
    full_dir = os.path.join(UPLOAD_DIR, date_dir)
    os.makedirs(full_dir, exist_ok=True)

    # Generate unique filename
    unique_name = f"{uuid.uuid4().hex}{ext}"
    file_path = os.path.join(full_dir, unique_name)

    # Save file
    with open(file_path, "wb") as f:
        f.write(content)

    # Return file metadata
    relative_path = f"{date_dir}/{unique_name}"
    return {
        "file_path": relative_path,
        "file_name": file.filename,
        "file_type": ext.lstrip('.'),
        "file_size": len(content),
        "category": category,
    }


@router.get("/{file_path:path}")
def download_file(
    file_path: str,
    current_user: User = Depends(get_current_user),
):
    full_path = os.path.join(UPLOAD_DIR, file_path)
    if not os.path.isfile(full_path):
        raise HTTPException(status_code=404, detail="Archivo no encontrado")
    return FileResponse(full_path)
