"""Service to create notifications for key PMO events."""
from sqlalchemy.orm import Session

from app.models.notification import Notification
from app.models.project import Project
from app.models.user import User


def _get_project_member_ids(db: Session, project_id: int) -> list[int]:
    """Get user IDs of all members assigned to a project."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        return []
    ids = [u.id for u in project.users]
    if project.pm_id and project.pm_id not in ids:
        ids.append(project.pm_id)
    return ids


def _get_pm_id(db: Session, project_id: int) -> int | None:
    project = db.query(Project).filter(Project.id == project_id).first()
    return project.pm_id if project else None


def notify_users(
    db: Session,
    user_ids: list[int],
    *,
    type: str,
    title: str,
    message: str | None = None,
    project_id: int | None = None,
    entity_type: str | None = None,
    entity_id: int | None = None,
    actor_id: int | None = None,
    exclude_actor: bool = True,
) -> list[Notification]:
    """Create a notification for each user in user_ids."""
    created = []
    for uid in user_ids:
        if exclude_actor and actor_id and uid == actor_id:
            continue
        notif = Notification(
            type=type,
            title=title,
            message=message,
            user_id=uid,
            project_id=project_id,
            entity_type=entity_type,
            entity_id=entity_id,
            actor_id=actor_id,
        )
        db.add(notif)
        created.append(notif)
    return created


# ── High-level event helpers ──────────────────────────────


def on_project_created(db: Session, project: Project, actor_id: int):
    members = _get_project_member_ids(db, project.id)
    notify_users(
        db, members,
        type="project_created",
        title="Nuevo proyecto creado",
        message=f'El proyecto "{project.name}" ({project.folio}) ha sido creado.',
        project_id=project.id,
        actor_id=actor_id,
    )


def on_project_phase_changed(db: Session, project: Project, old_phase: str, actor_id: int):
    members = _get_project_member_ids(db, project.id)
    notify_users(
        db, members,
        type="project_phase_changed",
        title="Cambio de fase",
        message=f'"{project.name}" cambió de {old_phase} a {project.phase}.',
        project_id=project.id,
        actor_id=actor_id,
    )


def on_project_health_changed(db: Session, project: Project, old_health: str, actor_id: int):
    labels = {"green": "Verde", "yellow": "Amarillo", "red": "Rojo"}
    members = _get_project_member_ids(db, project.id)
    notify_users(
        db, members,
        type="project_health_changed",
        title="Cambio de salud del proyecto",
        message=f'"{project.name}" cambió de {labels.get(old_health, old_health)} a {labels.get(project.health, project.health)}.',
        project_id=project.id,
        actor_id=actor_id,
    )


def on_task_assigned(db: Session, task, responsible_id: int, project_id: int, actor_id: int):
    notify_users(
        db, [responsible_id],
        type="task_assigned",
        title="Tarea asignada",
        message=f'Se te asignó la tarea "{task.name}".',
        project_id=project_id,
        entity_type="task",
        entity_id=task.id,
        actor_id=actor_id,
    )


def on_risk_created(db: Session, risk, project_id: int, actor_id: int):
    pm_id = _get_pm_id(db, project_id)
    targets = [pm_id] if pm_id else []
    severity = (risk.probability or 0) * (risk.impact or 0)
    if severity >= 15:
        targets = _get_project_member_ids(db, project_id)
        notify_users(
            db, targets,
            type="risk_high_severity",
            title="Riesgo de alta severidad",
            message=f'Riesgo "{risk.title}" con severidad {severity} registrado.',
            project_id=project_id,
            entity_type="risk",
            entity_id=risk.id,
            actor_id=actor_id,
        )
    else:
        notify_users(
            db, targets,
            type="risk_created",
            title="Nuevo riesgo registrado",
            message=f'Riesgo "{risk.title}" registrado.',
            project_id=project_id,
            entity_type="risk",
            entity_id=risk.id,
            actor_id=actor_id,
        )


def on_issue_created(db: Session, issue, project_id: int, actor_id: int):
    type_labels = {"action": "Acción", "issue": "Incidencia", "decision": "Decisión"}
    pm_id = _get_pm_id(db, project_id)
    targets = [pm_id] if pm_id else []
    notify_users(
        db, targets,
        type="issue_created",
        title=f'Nueva {type_labels.get(issue.type, "incidencia")}',
        message=f'{type_labels.get(issue.type, "Registro")} "{issue.title}" creado.',
        project_id=project_id,
        entity_type="issue",
        entity_id=issue.id,
        actor_id=actor_id,
    )


def on_change_status_changed(db: Session, change, old_status: str, project_id: int, actor_id: int):
    status_labels = {"approved": "aprobado", "rejected": "rechazado", "implemented": "implementado"}
    new_label = status_labels.get(change.status, change.status)
    members = _get_project_member_ids(db, project_id)
    notify_users(
        db, members,
        type="change_status_changed",
        title=f"Cambio {new_label}",
        message=f'El cambio "{change.title}" fue {new_label}.',
        project_id=project_id,
        entity_type="change",
        entity_id=change.id,
        actor_id=actor_id,
    )


def on_document_uploaded(db: Session, doc, project_id: int, actor_id: int):
    members = _get_project_member_ids(db, project_id)
    notify_users(
        db, members,
        type="document_uploaded",
        title="Documento subido",
        message=f'Se subió el documento "{doc.name}".',
        project_id=project_id,
        entity_type="document",
        entity_id=doc.id,
        actor_id=actor_id,
    )
