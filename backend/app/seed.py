"""
Seed the database with initial data: admin user, default roles, permissions, and sample data.

Run with: python -m app.seed
"""
from datetime import date

from app.database import engine, SessionLocal, Base
from app.models.user import User
from app.models.role import Role, Permission
from app.models.organization import Organization
from app.models.program import Program
from app.models.project import Project
from app.models.project_request import ProjectRequest
from app.models.modules import Risk, Issue, Change, Document, Lesson, Minute
from app.models.task import Task, TaskDependency
from app.models.audit import AuditLog
from app.models.report import ProgressReport
from app.auth.security import hash_password


def seed():
    # Create all tables
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        # Check if already seeded
        if db.query(User).first():
            print("Database already seeded. Skipping.")
            return

        # --- Permissions ---
        modules = ["projects", "risks", "issues", "changes", "documents", "lessons", "minutes", "admin", "requests"]
        actions = ["view", "create", "edit", "delete"]
        permissions = []
        for mod in modules:
            for act in actions:
                p = Permission(module=mod, action=act, description=f"{act} {mod}")
                permissions.append(p)
                db.add(p)
        db.flush()

        # --- Roles ---
        admin_role = Role(name="Administrador", description="Acceso total al sistema", is_system=True)
        admin_role.permissions = permissions
        db.add(admin_role)

        pmo_role = Role(name="PMO Manager", description="Gestión del portafolio de proyectos", is_system=True)
        pmo_role.permissions = [p for p in permissions if p.action in ("view", "create", "edit")]
        db.add(pmo_role)

        pm_role = Role(name="Project Manager", description="Gestión de proyectos asignados", is_system=True)
        pm_role.permissions = [p for p in permissions if p.module != "admin"]
        db.add(pm_role)

        viewer_role = Role(name="Viewer", description="Solo lectura", is_system=True)
        viewer_role.permissions = [p for p in permissions if p.action == "view"]
        db.add(viewer_role)
        db.flush()

        # --- Users ---
        admin = User(
            username="admin",
            email="admin@pmo-platform.com",
            full_name="Administrador PMO",
            hashed_password=hash_password("Admin123!"),
            is_active=True,
        )
        admin.roles.append(admin_role)
        db.add(admin)

        pm1 = User(
            username="jgarcia",
            email="j.garcia@empresa.com",
            full_name="Juan García López",
            hashed_password=hash_password("Pm1234!"),
            is_active=True,
        )
        pm1.roles.append(pm_role)
        db.add(pm1)

        pm2 = User(
            username="mrodriguez",
            email="m.rodriguez@empresa.com",
            full_name="María Rodríguez Sánchez",
            hashed_password=hash_password("Pm1234!"),
            is_active=True,
        )
        pm2.roles.append(pm_role)
        db.add(pm2)
        db.flush()

        # --- Organizations ---
        org1 = Organization(name="Grupo Alfa", legal_name="Grupo Alfa S.A. de C.V.", industry="Manufactura", country="México", is_active=True, created_by_id=admin.id)
        org2 = Organization(name="TechNova", legal_name="TechNova Solutions S.A.", industry="Tecnología", country="México", is_active=True, created_by_id=admin.id)
        org3 = Organization(name="Distribuidora MX", legal_name="Distribuidora MX S. de R.L.", industry="Distribución", country="México", is_active=True, created_by_id=admin.id)
        org4 = Organization(name="Servicios Global", legal_name="Servicios Global Corp.", industry="Servicios", country="México", is_active=True, created_by_id=admin.id)
        db.add_all([org1, org2, org3, org4])
        db.flush()

        # --- Projects ---
        sample_projects = [
            Project(folio="PRJ-2026-001", name="Migración ERP SAP", type="Tecnología", priority="Alta", phase="Ejecución", health="yellow", start_date=date(2026,1,15), end_date=date(2026,8,30), budget=2500000, real_budget=1800000, progress=65, planned_progress=70, organization_id=org1.id, pm_id=pm1.id, created_by_id=admin.id),
            Project(folio="PRJ-2026-002", name="Portal Clientes B2B", type="Digital", priority="Alta", phase="Ejecución", health="green", start_date=date(2026,2,1), end_date=date(2026,7,15), budget=1200000, real_budget=520000, progress=45, planned_progress=40, organization_id=org2.id, pm_id=pm2.id, created_by_id=admin.id),
            Project(folio="PRJ-2026-003", name="Automatización Nómina", type="Procesos", priority="Media", phase="Planificación", health="yellow", start_date=date(2026,3,1), end_date=date(2026,9,30), budget=800000, real_budget=120000, progress=15, planned_progress=20, organization_id=org1.id, pm_id=pm1.id, created_by_id=admin.id),
            Project(folio="PRJ-2026-004", name="App Móvil Ventas", type="Digital", priority="Alta", phase="Ejecución", health="green", start_date=date(2025,11,1), end_date=date(2026,5,15), budget=950000, real_budget=780000, progress=80, planned_progress=75, organization_id=org3.id, pm_id=pm2.id, created_by_id=admin.id),
            Project(folio="PRJ-2026-005", name="Rediseño Website Corporativo", type="Digital", priority="Baja", phase="Soporte", health="green", start_date=date(2025,9,1), end_date=date(2026,3,31), budget=350000, real_budget=340000, progress=95, planned_progress=100, organization_id=org2.id, pm_id=pm1.id, created_by_id=admin.id),
            Project(folio="PRJ-2026-006", name="Implementación CRM Salesforce", type="Tecnología", priority="Alta", phase="Ejecución", health="red", start_date=date(2025,12,1), end_date=date(2026,10,31), budget=3200000, real_budget=1900000, progress=30, planned_progress=50, organization_id=org4.id, pm_id=pm2.id, created_by_id=admin.id),
            Project(folio="PRJ-2026-007", name="Data Warehouse Analytics", type="Tecnología", priority="Media", phase="Planificación", health="green", start_date=date(2026,3,15), end_date=date(2026,12,31), budget=1800000, real_budget=95000, progress=10, planned_progress=12, organization_id=org1.id, pm_id=pm1.id, created_by_id=admin.id),
            Project(folio="PRJ-2026-008", name="Certificación ISO 27001", type="Procesos", priority="Media", phase="Ejecución", health="yellow", start_date=date(2026,1,1), end_date=date(2026,6,30), budget=600000, real_budget=350000, progress=55, planned_progress=60, organization_id=org4.id, pm_id=pm1.id, created_by_id=admin.id),
            Project(folio="PRJ-2025-012", name="Renovación Infraestructura Red", type="Infraestructura", priority="Alta", phase="Cerrado", health="green", start_date=date(2025,6,1), end_date=date(2026,1,31), budget=2100000, real_budget=2250000, progress=100, planned_progress=100, organization_id=org3.id, pm_id=pm2.id, created_by_id=admin.id),
            Project(folio="PRJ-2026-009", name="Sistema de Facturación 4.0", type="Regulatorio", priority="Alta", phase="Ejecución", health="green", start_date=date(2026,1,10), end_date=date(2026,4,30), budget=450000, real_budget=310000, progress=70, planned_progress=65, organization_id=org1.id, pm_id=pm2.id, created_by_id=admin.id),
        ]
        db.add_all(sample_projects)
        db.flush()

        # --- Sample Risks ---
        db.add_all([
            Risk(folio="RSK-2026-001", title="Retraso en entrega de licencias SAP", description="El proveedor puede no entregar a tiempo", category="Proveedor", probability=4, impact=5, severity=20, status="open", identification_date=date(2026,1,20), project_id=sample_projects[0].id, created_by_id=pm1.id),
            Risk(folio="RSK-2026-002", title="Rotación de personal clave", description="Riesgo de salida del arquitecto principal", category="Recurso", probability=3, impact=4, severity=12, status="open", identification_date=date(2026,2,5), project_id=sample_projects[0].id, created_by_id=pm1.id),
            Risk(folio="RSK-2026-003", title="Cambio en regulación fiscal", description="Posibles cambios en la normativa de facturación", category="Externo", probability=2, impact=5, severity=10, status="open", identification_date=date(2026,1,15), project_id=sample_projects[9].id, created_by_id=pm2.id),
        ])

        # --- Sample Issues ---
        db.add_all([
            Issue(folio="INC-2026-001", title="Integración API fallando en staging", description="Error 500 al conectar con ERP", type="issue", priority="Alta", status="open", report_date=date(2026,3,10), commitment_date=date(2026,3,20), project_id=sample_projects[0].id, created_by_id=pm1.id),
            Issue(folio="INC-2026-002", title="Definir estándar de documentación", description="Equipo necesita alinearse en formato", type="decision", priority="Media", status="open", report_date=date(2026,3,5), project_id=sample_projects[1].id, created_by_id=pm2.id),
        ])

        # --- Sample Changes ---
        db.add_all([
            Change(folio="CHG-2026-001", title="Ampliar alcance módulo de reportes", description="Incluir reportes ejecutivos adicionales", change_type="scope", impact="2 semanas adicionales", requested_by="Director Comercial", request_date=date(2026,3,1), status="in_review", project_id=sample_projects[5].id, created_by_id=pm2.id),
        ])

        db.commit()
        print("Database seeded successfully!")
        print("  Admin user: admin / Admin123!")
        print("  PM user 1:  jgarcia / Pm1234!")
        print("  PM user 2:  mrodriguez / Pm1234!")

    finally:
        db.close()


if __name__ == "__main__":
    seed()
