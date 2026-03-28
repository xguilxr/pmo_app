import io
import csv
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.project import Project
from app.models.modules import Risk, Issue, Change, Document, Lesson
from app.models.backlog import BacklogItem
from app.models.task import Task
from app.auth.security import get_current_user

router = APIRouter(prefix="/exports", tags=["Exports"])


def make_csv(headers: list[str], rows: list[list]) -> StreamingResponse:
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(headers)
    writer.writerows(rows)
    output.seek(0)
    # Convert to bytes with BOM for Excel compatibility
    content = b'\xef\xbb\xbf' + output.getvalue().encode('utf-8')
    return StreamingResponse(
        io.BytesIO(content),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f"attachment; filename=export_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.csv"}
    )


@router.get("/risks")
def export_risks(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    risks = db.query(Risk).filter(Risk.project_id == project_id, Risk.deleted_at.is_(None)).all()
    headers = ["Folio", "Título", "Descripción", "Categoría", "Probabilidad", "Impacto", "Severidad", "Estrategia de Mitigación", "Estado", "Fecha Identificación", "Fecha Límite"]
    rows = [[r.folio, r.title, r.description or "", r.category or "", r.probability, r.impact, r.severity, r.mitigation_strategy or "", r.status, str(r.identification_date or ""), str(r.deadline or "")] for r in risks]
    resp = make_csv(headers, rows)
    resp.headers["Content-Disposition"] = f"attachment; filename=riesgos_proyecto_{project_id}.csv"
    return resp


@router.get("/issues")
def export_issues(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    issues = db.query(Issue).filter(Issue.project_id == project_id, Issue.deleted_at.is_(None)).all()
    headers = ["Folio", "Título", "Descripción", "Tipo", "Prioridad", "Estado", "Resolución", "Fecha Reporte", "Fecha Compromiso"]
    rows = [[i.folio, i.title, i.description or "", i.type or "", i.priority or "", i.status, i.resolution or "", str(i.report_date or ""), str(i.commitment_date or "")] for i in issues]
    resp = make_csv(headers, rows)
    resp.headers["Content-Disposition"] = f"attachment; filename=issues_proyecto_{project_id}.csv"
    return resp


@router.get("/changes")
def export_changes(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    changes = db.query(Change).filter(Change.project_id == project_id, Change.deleted_at.is_(None)).all()
    headers = ["Folio", "Título", "Descripción", "Tipo de Cambio", "Impacto", "Solicitado Por", "Fecha Solicitud", "Estado", "Comentarios"]
    rows = [[c.folio, c.title, c.description or "", c.change_type or "", c.impact or "", c.requested_by or "", str(c.request_date or ""), c.status, c.comments or ""] for c in changes]
    resp = make_csv(headers, rows)
    resp.headers["Content-Disposition"] = f"attachment; filename=cambios_proyecto_{project_id}.csv"
    return resp


@router.get("/backlog")
def export_backlog(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    items = db.query(BacklogItem).filter(BacklogItem.project_id == project_id, BacklogItem.deleted_at.is_(None)).all()
    headers = ["Folio", "Título", "Descripción", "Área", "Prioridad", "Estado", "Progreso", "Fecha Inicio", "Fecha Fin", "Retrasado"]
    rows = [[b.folio, b.title, b.description or "", b.area or "", b.priority or "", b.status, b.progress, str(b.start_date or ""), str(b.end_date or ""), "Sí" if b.was_delayed else "No"] for b in items]
    resp = make_csv(headers, rows)
    resp.headers["Content-Disposition"] = f"attachment; filename=backlog_proyecto_{project_id}.csv"
    return resp


@router.get("/tasks")
def export_tasks(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    tasks = db.query(Task).filter(Task.project_id == project_id, Task.deleted_at.is_(None)).order_by(Task.wbs).all()
    headers = ["WBS", "Nombre", "Descripción", "Inicio", "Fin", "Duración (días)", "Progreso", "Estado", "Prioridad", "Hito"]
    rows = [[t.wbs or "", t.name, t.description or "", str(t.start_date or ""), str(t.end_date or ""), t.duration_days or 0, t.progress, t.status, t.priority or "", "Sí" if t.is_milestone else "No"] for t in tasks]
    resp = make_csv(headers, rows)
    resp.headers["Content-Disposition"] = f"attachment; filename=tareas_proyecto_{project_id}.csv"
    return resp


@router.get("/lessons")
def export_lessons(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    lessons = db.query(Lesson).filter(Lesson.project_id == project_id, Lesson.deleted_at.is_(None)).all()
    headers = ["Folio", "Título", "Descripción", "Categoría", "Fase del Proyecto", "Recomendación"]
    rows = [[l.folio, l.title, l.description or "", l.category or "", l.project_phase or "", l.recommendation or ""] for l in lessons]
    resp = make_csv(headers, rows)
    resp.headers["Content-Disposition"] = f"attachment; filename=lecciones_proyecto_{project_id}.csv"
    return resp
