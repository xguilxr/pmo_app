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


@router.get("/project-xlsx")
def export_project_xlsx(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Export multi-sheet XLSX: Backlog + RAID (Riesgos, Acciones, Incidencias, Decisiones)."""
    from openpyxl import Workbook
    from openpyxl.styles import Font, PatternFill, Alignment, Border, Side

    project = db.query(Project).filter(Project.id == project_id, Project.deleted_at.is_(None)).first()
    if not project:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")

    wb = Workbook()

    # Style helpers
    header_font = Font(bold=True, color="FFFFFF", size=11)
    header_fill = PatternFill(start_color="2563EB", end_color="2563EB", fill_type="solid")
    thin_border = Border(
        left=Side(style='thin', color='D1D5DB'),
        right=Side(style='thin', color='D1D5DB'),
        top=Side(style='thin', color='D1D5DB'),
        bottom=Side(style='thin', color='D1D5DB'),
    )

    def write_sheet(ws, headers, rows):
        for col_idx, h in enumerate(headers, 1):
            cell = ws.cell(row=1, column=col_idx, value=h)
            cell.font = header_font
            cell.fill = header_fill
            cell.alignment = Alignment(horizontal='center')
            cell.border = thin_border
        for row_idx, row in enumerate(rows, 2):
            for col_idx, val in enumerate(row, 1):
                cell = ws.cell(row=row_idx, column=col_idx, value=val)
                cell.border = thin_border
        # Auto-width
        for col_idx, h in enumerate(headers, 1):
            max_len = len(str(h))
            for row in rows:
                if col_idx - 1 < len(row) and row[col_idx - 1] is not None:
                    max_len = max(max_len, len(str(row[col_idx - 1])))
            ws.column_dimensions[ws.cell(row=1, column=col_idx).column_letter].width = min(max_len + 4, 50)

    # Sheet 1: Backlog
    ws_backlog = wb.active
    ws_backlog.title = "Backlog"
    backlog_items = db.query(BacklogItem).filter(BacklogItem.project_id == project_id, BacklogItem.deleted_at.is_(None)).all()
    write_sheet(ws_backlog,
        ["Folio", "Titulo", "Descripcion", "Area", "Prioridad", "Estado", "Progreso %", "F. Inicio", "F. Fin", "Retrasado"],
        [[b.folio, b.title, b.description or "", b.area or "", b.priority or "", b.status, b.progress, str(b.start_date or ""), str(b.end_date or ""), "Si" if b.was_delayed else "No"] for b in backlog_items]
    )

    # Sheet 2: Riesgos (R)
    ws_risks = wb.create_sheet("Riesgos")
    risks = db.query(Risk).filter(Risk.project_id == project_id, Risk.deleted_at.is_(None)).all()
    write_sheet(ws_risks,
        ["Folio", "Titulo", "Descripcion", "Categoria", "Probabilidad", "Impacto", "Severidad", "Estrategia Mitigacion", "Estado", "F. Identificacion", "F. Limite"],
        [[r.folio, r.title, r.description or "", r.category or "", r.probability, r.impact, r.severity, r.mitigation_strategy or "", r.status, str(r.identification_date or ""), str(r.deadline or "")] for r in risks]
    )

    # Sheet 3: Acciones (A) - Issues with type=action
    ws_actions = wb.create_sheet("Acciones")
    actions = db.query(Issue).filter(Issue.project_id == project_id, Issue.deleted_at.is_(None), Issue.type == "action").all()
    write_sheet(ws_actions,
        ["Folio", "Titulo", "Descripcion", "Prioridad", "Estado", "Resolucion", "F. Reporte", "F. Compromiso"],
        [[i.folio, i.title, i.description or "", i.priority or "", i.status, i.resolution or "", str(i.report_date or ""), str(i.commitment_date or "")] for i in actions]
    )

    # Sheet 4: Incidencias (I) - Issues with type=issue
    ws_issues = wb.create_sheet("Incidencias")
    issues = db.query(Issue).filter(Issue.project_id == project_id, Issue.deleted_at.is_(None), Issue.type == "issue").all()
    write_sheet(ws_issues,
        ["Folio", "Titulo", "Descripcion", "Prioridad", "Estado", "Resolucion", "F. Reporte", "F. Compromiso"],
        [[i.folio, i.title, i.description or "", i.priority or "", i.status, i.resolution or "", str(i.report_date or ""), str(i.commitment_date or "")] for i in issues]
    )

    # Sheet 5: Decisiones (D) - Issues with type=decision
    ws_decisions = wb.create_sheet("Decisiones")
    decisions = db.query(Issue).filter(Issue.project_id == project_id, Issue.deleted_at.is_(None), Issue.type == "decision").all()
    write_sheet(ws_decisions,
        ["Folio", "Titulo", "Descripcion", "Prioridad", "Estado", "Resolucion", "F. Reporte", "F. Compromiso"],
        [[i.folio, i.title, i.description or "", i.priority or "", i.status, i.resolution or "", str(i.report_date or ""), str(i.commitment_date or "")] for i in decisions]
    )

    # Save to bytes
    output = io.BytesIO()
    wb.save(output)
    output.seek(0)

    filename = f"proyecto_{project.folio}_{datetime.now(timezone.utc).strftime('%Y%m%d')}.xlsx"
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


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
