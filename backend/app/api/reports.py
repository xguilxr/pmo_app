from datetime import date, datetime, timezone
from io import BytesIO
import json

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.project import Project
from app.models.report import ProgressReport
from app.models.modules import Risk, Issue, Change, Lesson
from app.models.task import Task
from app.models.backlog import BacklogItem
from app.schemas.report import ReportCreate, ReportUpdate, ReportResponse
from app.auth.security import get_current_user
from app.services.ai_engine import generate_report

router = APIRouter(prefix="/reports", tags=["Reports"])


@router.get("", response_model=list[ReportResponse])
def list_reports(
    project_id: int | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(ProgressReport).filter(ProgressReport.deleted_at.is_(None))
    if project_id:
        query = query.filter(ProgressReport.project_id == project_id)
    return query.order_by(ProgressReport.created_at.desc()).all()


@router.get("/{report_id}", response_model=ReportResponse)
def get_report(report_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    report = db.query(ProgressReport).filter(ProgressReport.id == report_id, ProgressReport.deleted_at.is_(None)).first()
    if not report:
        raise HTTPException(status_code=404, detail="Reporte no encontrado")
    return report


@router.post("", response_model=ReportResponse, status_code=status.HTTP_201_CREATED)
async def create_report(
    project_id: int,
    data: ReportCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = db.query(Project).filter(Project.id == project_id, Project.deleted_at.is_(None)).first()
    if not project:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")

    ai_model_used = None

    if data.use_ai:
        # Collect project data for AI prompt
        project_data = _collect_project_data(db, project, data.period_start, data.period_end)
        try:
            result = await generate_report(data.report_type, project_data)
            content_html = result["text"]
            ai_model_used = result["model"]
        except RuntimeError as e:
            raise HTTPException(status_code=503, detail=str(e))
    else:
        # Fallback to template-based report
        content_html = _generate_report_html(db, project, data.period_start, data.period_end)

    report = ProgressReport(
        title=data.title,
        content_html=content_html,
        period_start=data.period_start,
        period_end=data.period_end,
        status=data.status,
        ai_model_used=ai_model_used,
        project_id=project_id,
        generated_by_id=current_user.id,
        created_by_id=current_user.id,
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    return report


@router.patch("/{report_id}", response_model=ReportResponse)
def update_report(
    report_id: int,
    data: ReportUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    report = db.query(ProgressReport).filter(ProgressReport.id == report_id, ProgressReport.deleted_at.is_(None)).first()
    if not report:
        raise HTTPException(status_code=404, detail="Reporte no encontrado")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(report, field, value)
    if data.status == "sent" and not report.sent_date:
        report.sent_date = date.today()
    db.commit()
    db.refresh(report)
    return report


@router.delete("/{report_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_report(report_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    report = db.query(ProgressReport).filter(ProgressReport.id == report_id, ProgressReport.deleted_at.is_(None)).first()
    if not report:
        raise HTTPException(status_code=404, detail="Reporte no encontrado")
    report.deleted_at = datetime.now(timezone.utc)
    db.commit()


@router.get("/{report_id}/download")
def download_report(report_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Download report as HTML file (can be opened/printed as PDF from browser)."""
    report = db.query(ProgressReport).filter(ProgressReport.id == report_id, ProgressReport.deleted_at.is_(None)).first()
    if not report:
        raise HTTPException(status_code=404, detail="Reporte no encontrado")

    html = f"""<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>{report.title}</title>
<style>
  body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 40px; color: #1a1a2e; line-height: 1.6; }}
  h1 {{ color: #1e3a5f; border-bottom: 2px solid #3b82f6; padding-bottom: 10px; }}
  h2 {{ color: #334155; margin-top: 30px; }}
  table {{ border-collapse: collapse; width: 100%; margin: 15px 0; }}
  th, td {{ border: 1px solid #e2e8f0; padding: 8px 12px; text-align: left; font-size: 13px; }}
  th {{ background: #f1f5f9; font-weight: 600; color: #475569; }}
  .header {{ display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }}
  .period {{ color: #64748b; font-size: 14px; }}
  .badge {{ display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 11px; font-weight: 600; }}
  .badge-draft {{ background: #f1f5f9; color: #64748b; }}
  .badge-sent {{ background: #dcfce7; color: #16a34a; }}
  .kpi {{ display: inline-block; padding: 15px 25px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; margin: 5px; text-align: center; }}
  .kpi-value {{ font-size: 24px; font-weight: 700; color: #1e3a5f; }}
  .kpi-label {{ font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; }}
  @media print {{ body {{ margin: 20px; }} }}
</style>
</head>
<body>
<div class="header">
  <h1>{report.title}</h1>
  <span class="badge badge-{report.status}">{report.status.upper()}</span>
</div>
<p class="period">Período: {report.period_start or '—'} a {report.period_end or '—'}</p>
{report.content_html or '<p>Sin contenido</p>'}
</body>
</html>"""

    buffer = BytesIO(html.encode("utf-8"))
    filename = f"reporte_{report_id}.html"
    return StreamingResponse(
        buffer,
        media_type="text/html",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


def _collect_project_data(db: Session, project: Project, period_start: date | None, period_end: date | None) -> str:
    """Collect project data into a structured text block for AI prompt context."""
    tasks = db.query(Task).filter(Task.project_id == project.id, Task.deleted_at.is_(None)).all()
    risks = db.query(Risk).filter(Risk.project_id == project.id, Risk.deleted_at.is_(None)).all()
    issues = db.query(Issue).filter(Issue.project_id == project.id, Issue.deleted_at.is_(None)).all()
    changes = db.query(Change).filter(Change.project_id == project.id, Change.deleted_at.is_(None)).all()
    lessons = db.query(Lesson).filter(Lesson.project_id == project.id, Lesson.deleted_at.is_(None)).all()
    backlog = db.query(BacklogItem).filter(BacklogItem.project_id == project.id, BacklogItem.deleted_at.is_(None)).all()

    total_tasks = len(tasks)
    completed_tasks = sum(1 for t in tasks if t.status == "completed")
    in_progress_tasks = sum(1 for t in tasks if t.status == "in_progress")
    delayed_tasks = sum(1 for t in tasks if t.was_delayed)
    avg_progress = round(sum(t.progress for t in tasks) / total_tasks, 1) if total_tasks else 0

    open_risks = [r for r in risks if r.status in ("open", "Abierto")]
    open_issues = [i for i in issues if i.status in ("open", "Abierto")]
    pending_changes = [c for c in changes if c.status in ("in_review", "Pendiente")]

    data = f"""
PROYECTO: {project.name}
FOLIO: {project.folio}
FASE: {project.phase}
SALUD: {project.health}
PRIORIDAD: {project.priority}
TIPO: {project.type}
FECHA INICIO: {project.start_date or 'N/A'}
FECHA FIN: {project.end_date or 'N/A'}
AVANCE REAL: {project.progress}%
AVANCE PLANEADO: {project.planned_progress or 0}%
PRESUPUESTO PLANEADO: ${project.budget:,.0f}
PRESUPUESTO REAL: ${project.real_budget:,.0f}
PERÍODO REPORTE: {period_start or 'N/A'} a {period_end or 'N/A'}

TAREAS ({total_tasks} total):
- Completadas: {completed_tasks}
- En progreso: {in_progress_tasks}
- Pendientes: {total_tasks - completed_tasks - in_progress_tasks}
- Retrasadas: {delayed_tasks}
- Avance promedio: {avg_progress}%
"""

    # Add task details (limit to 40)
    if tasks:
        data += "\nDETALLE DE TAREAS:\n"
        for t in tasks[:40]:
            delay_flag = " [RETRASADA]" if t.was_delayed else ""
            data += f"  - WBS:{t.wbs or '-'} | {t.name} | Estado:{t.status} | Avance:{t.progress}% | Fin:{t.end_date or '-'} | Responsable:{t.responsible_name or '-'}{delay_flag}\n"

    # Risks
    if risks:
        data += f"\nRIESGOS ({len(risks)} total, {len(open_risks)} abiertos):\n"
        for r in risks:
            data += f"  - [{r.status}] {r.title} | Severidad:{r.severity} | Probabilidad:{r.probability} | Impacto:{r.impact} | Mitigación:{r.mitigation_strategy or 'N/A'}\n"

    # Issues
    if issues:
        data += f"\nISSUES ({len(issues)} total, {len(open_issues)} abiertos):\n"
        for i in issues:
            data += f"  - [{i.status}] {i.title} | Prioridad:{i.priority or '-'} | Tipo:{i.type or '-'}\n"

    # Changes
    if changes:
        data += f"\nCAMBIOS ({len(changes)} total, {len(pending_changes)} pendientes):\n"
        for c in changes:
            data += f"  - [{c.status}] {c.title} | Impacto:{c.impact or '-'} | Solicitado por:{c.requested_by or '-'}\n"

    # Backlog
    if backlog:
        data += f"\nBACKLOG ({len(backlog)} elementos):\n"
        for b in backlog:
            data += f"  - [{b.status}] {b.title} | Área:{b.area or '-'} | Prioridad:{b.priority or '-'} | Avance:{b.progress}%\n"

    # Lessons
    if lessons:
        data += f"\nLECCIONES APRENDIDAS ({len(lessons)}):\n"
        for l in lessons:
            data += f"  - {l.title} | Categoría:{l.category or '-'} | Fase:{l.project_phase or '-'}\n"

    return data


def _generate_report_html(db: Session, project: Project, period_start: date | None, period_end: date | None) -> str:
    """Generate report HTML content from real project data."""
    # Gather project metrics
    tasks = db.query(Task).filter(Task.project_id == project.id, Task.deleted_at.is_(None)).all()
    risks = db.query(Risk).filter(Risk.project_id == project.id, Risk.deleted_at.is_(None)).all()
    issues = db.query(Issue).filter(Issue.project_id == project.id, Issue.deleted_at.is_(None)).all()
    changes = db.query(Change).filter(Change.project_id == project.id, Change.deleted_at.is_(None)).all()

    total_tasks = len(tasks)
    completed_tasks = sum(1 for t in tasks if t.status == "completed")
    in_progress_tasks = sum(1 for t in tasks if t.status == "in_progress")
    delayed_tasks = sum(1 for t in tasks if t.was_delayed)
    avg_progress = round(sum(t.progress for t in tasks) / total_tasks, 1) if total_tasks > 0 else 0

    open_risks = sum(1 for r in risks if r.status in ("open", "Abierto"))
    open_issues = sum(1 for i in issues if i.status in ("open", "Abierto"))
    pending_changes = sum(1 for c in changes if c.status in ("in_review", "Pendiente"))

    fmt_budget = f"${project.budget:,.0f}" if project.budget else "$0"
    fmt_real = f"${project.real_budget:,.0f}" if project.real_budget else "$0"

    html = f"""
<div style="display:flex; flex-wrap:wrap; gap:10px; margin-bottom:25px;">
  <div class="kpi"><div class="kpi-value">{project.progress}%</div><div class="kpi-label">Avance Real</div></div>
  <div class="kpi"><div class="kpi-value">{project.planned_progress or 0}%</div><div class="kpi-label">Avance Planeado</div></div>
  <div class="kpi"><div class="kpi-value">{fmt_budget}</div><div class="kpi-label">Presupuesto</div></div>
  <div class="kpi"><div class="kpi-value">{fmt_real}</div><div class="kpi-label">Gasto Real</div></div>
</div>

<h2>Resumen del Proyecto</h2>
<table>
  <tr><th>Campo</th><th>Valor</th></tr>
  <tr><td>Proyecto</td><td>{project.name}</td></tr>
  <tr><td>Folio</td><td>{project.folio}</td></tr>
  <tr><td>Fase</td><td>{project.phase}</td></tr>
  <tr><td>Salud</td><td>{project.health}</td></tr>
  <tr><td>Fecha Inicio</td><td>{project.start_date or '—'}</td></tr>
  <tr><td>Fecha Fin</td><td>{project.end_date or '—'}</td></tr>
</table>

<h2>Tareas ({total_tasks})</h2>
<table>
  <tr><th>Métrica</th><th>Cantidad</th></tr>
  <tr><td>Total de tareas</td><td>{total_tasks}</td></tr>
  <tr><td>Completadas</td><td>{completed_tasks}</td></tr>
  <tr><td>En progreso</td><td>{in_progress_tasks}</td></tr>
  <tr><td>Retrasadas</td><td>{delayed_tasks}</td></tr>
  <tr><td>Avance promedio</td><td>{avg_progress}%</td></tr>
</table>
"""

    if tasks:
        html += """
<h3>Detalle de Tareas</h3>
<table>
  <tr><th>WBS</th><th>Tarea</th><th>Estado</th><th>Avance</th><th>Fecha Fin</th></tr>
"""
        for t in tasks[:30]:  # Limit to 30 tasks
            html += f"  <tr><td>{t.wbs or '—'}</td><td>{t.name}</td><td>{t.status}</td><td>{t.progress}%</td><td>{t.end_date or '—'}</td></tr>\n"
        html += "</table>\n"

    if risks:
        html += f"""
<h2>Riesgos ({len(risks)} total, {open_risks} abiertos)</h2>
<table>
  <tr><th>Folio</th><th>Título</th><th>Severidad</th><th>Estado</th></tr>
"""
        for r in risks:
            html += f"  <tr><td>{r.folio}</td><td>{r.title}</td><td>{r.severity}</td><td>{r.status}</td></tr>\n"
        html += "</table>\n"

    if issues:
        html += f"""
<h2>Issues ({len(issues)} total, {open_issues} abiertos)</h2>
<table>
  <tr><th>Folio</th><th>Título</th><th>Prioridad</th><th>Estado</th></tr>
"""
        for i in issues:
            html += f"  <tr><td>{i.folio}</td><td>{i.title}</td><td>{i.priority}</td><td>{i.status}</td></tr>\n"
        html += "</table>\n"

    if changes:
        html += f"""
<h2>Cambios ({len(changes)} total, {pending_changes} pendientes)</h2>
<table>
  <tr><th>Folio</th><th>Título</th><th>Impacto</th><th>Estado</th></tr>
"""
        for c in changes:
            html += f"  <tr><td>{c.folio}</td><td>{c.title}</td><td>{c.impact}</td><td>{c.status}</td></tr>\n"
        html += "</table>\n"

    html += f"""
<hr style="margin-top:30px; border-color:#e2e8f0;">
<p style="font-size:11px; color:#94a3b8;">Generado automáticamente por PMO Platform — {date.today()}</p>
"""
    return html
