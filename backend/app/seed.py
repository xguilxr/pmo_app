"""
Seed the database with initial data.

Usage:
  python -m app.seed          # Minimal: roles, permissions, admin user only
  python -m app.seed --demo   # Full demo data with 2 tenants, programs, projects, etc.
"""
import sys
from datetime import date

from sqlalchemy.orm import Session

from app.database import engine, SessionLocal, Base
from app.models.user import User
from app.models.role import Role, Permission
from app.models.organization import Organization
from app.models.program import Program
from app.models.project import Project
from app.models.project_request import ProjectRequest
from app.models.modules import Risk, Issue, Change, Document, Lesson, Minute
import app.models  # noqa: F401 - register all models with SQLAlchemy mapper
from app.auth.security import hash_password


def seed_minimal(db: Session) -> tuple[User, Role, Role, Role, Role]:
    """Create only roles, permissions, and admin user."""

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

    pmo_role = Role(name="PMO Manager", description="Gestion del portafolio de proyectos", is_system=True)
    pmo_role.permissions = [p for p in permissions if p.action in ("view", "create", "edit")]
    db.add(pmo_role)

    pm_role = Role(name="Project Manager", description="Gestion de proyectos asignados", is_system=True)
    pm_role.permissions = [p for p in permissions if p.module != "admin"]
    db.add(pm_role)

    viewer_role = Role(name="Viewer", description="Solo lectura", is_system=True)
    viewer_role.permissions = [p for p in permissions if p.action == "view"]
    db.add(viewer_role)
    db.flush()

    # --- Admin user (super admin for multi-tenant management) ---
    admin = User(
        username="admin",
        email="admin@pmo-platform.com",
        full_name="Administrador PMO",
        hashed_password=hash_password("Admin123!"),
        is_active=True,
        is_superadmin=True,
    )
    admin.roles.append(admin_role)
    db.add(admin)
    db.flush()

    return admin, admin_role, pmo_role, pm_role, viewer_role


def seed_demo(db: Session, admin: User, admin_role: Role, pmo_role: Role, pm_role: Role, viewer_role: Role) -> None:
    """Create 2 tenants with full demo data: users, programs, projects, requests, modules."""

    # =====================================================================
    # TENANT 1: Grupo Alfa (Manufacturing)
    # =====================================================================
    t1 = Organization(
        name="Grupo Alfa", legal_name="Grupo Alfa S.A. de C.V.",
        industry="Manufactura", country="Mexico", is_active=True,
        created_by_id=admin.id,
        slug="grupo-alfa", primary_color="#10B981", secondary_color="#14B8A6",
        contact_name="Carlos Mendez", contact_email="carlos.mendez@grupoalfa.com",
        contact_phone="+52 81 1234 5678",
        config_json={"app_name": "Grupo Alfa PMO", "favicon": None},
    )

    # =====================================================================
    # TENANT 2: TechNova (Technology)
    # =====================================================================
    t2 = Organization(
        name="TechNova Solutions", legal_name="TechNova Solutions S.A.",
        industry="Tecnologia", country="Mexico", is_active=True,
        created_by_id=admin.id,
        slug="technova", primary_color="#8B5CF6", secondary_color="#A855F7",
        contact_name="Laura Rios", contact_email="laura.rios@technova.com",
        contact_phone="+52 55 9876 5432",
        config_json={"app_name": "TechNova PMO", "favicon": None},
    )
    db.add_all([t1, t2])
    db.flush()

    # =====================================================================
    # USERS — Tenant 1: Grupo Alfa
    # =====================================================================
    t1_admin = User(
        username="alfa_admin", email="admin@grupoalfa.com",
        full_name="Carlos Mendez Rivera",
        hashed_password=hash_password("Alfa123!"), is_active=True,
    )
    t1_admin.roles.append(admin_role)
    db.add(t1_admin)

    t1_pmo = User(
        username="alfa_pmo", email="pmo@grupoalfa.com",
        full_name="Ana Garcia Torres",
        hashed_password=hash_password("Alfa123!"), is_active=True,
    )
    t1_pmo.roles.append(pmo_role)
    db.add(t1_pmo)

    t1_pm1 = User(
        username="jgarcia", email="j.garcia@grupoalfa.com",
        full_name="Juan Garcia Lopez",
        hashed_password=hash_password("Pm1234!"), is_active=True,
    )
    t1_pm1.roles.append(pm_role)
    db.add(t1_pm1)

    t1_pm2 = User(
        username="rlopez", email="r.lopez@grupoalfa.com",
        full_name="Roberto Lopez Hernandez",
        hashed_password=hash_password("Pm1234!"), is_active=True,
    )
    t1_pm2.roles.append(pm_role)
    db.add(t1_pm2)

    t1_viewer = User(
        username="alfa_viewer", email="viewer@grupoalfa.com",
        full_name="Sofia Martinez Ruiz",
        hashed_password=hash_password("View123!"), is_active=True,
    )
    t1_viewer.roles.append(viewer_role)
    db.add(t1_viewer)

    # =====================================================================
    # USERS — Tenant 2: TechNova
    # =====================================================================
    t2_admin = User(
        username="nova_admin", email="admin@technova.com",
        full_name="Laura Rios Sanchez",
        hashed_password=hash_password("Nova123!"), is_active=True,
    )
    t2_admin.roles.append(admin_role)
    db.add(t2_admin)

    t2_pm1 = User(
        username="mrodriguez", email="m.rodriguez@technova.com",
        full_name="Maria Rodriguez Sanchez",
        hashed_password=hash_password("Pm1234!"), is_active=True,
    )
    t2_pm1.roles.append(pm_role)
    db.add(t2_pm1)

    t2_pm2 = User(
        username="dmorales", email="d.morales@technova.com",
        full_name="Diego Morales Vega",
        hashed_password=hash_password("Pm1234!"), is_active=True,
    )
    t2_pm2.roles.append(pm_role)
    db.add(t2_pm2)

    t2_pmo = User(
        username="nova_pmo", email="pmo@technova.com",
        full_name="Patricia Dominguez Luna",
        hashed_password=hash_password("Nova123!"), is_active=True,
    )
    t2_pmo.roles.append(pmo_role)
    db.add(t2_pmo)

    db.flush()

    # --- Organization assignments ---
    admin.organizations.extend([t1, t2])
    t1_admin.organizations.append(t1)
    t1_pmo.organizations.append(t1)
    t1_pm1.organizations.append(t1)
    t1_pm2.organizations.append(t1)
    t1_viewer.organizations.append(t1)
    t2_admin.organizations.append(t2)
    t2_pm1.organizations.append(t2)
    t2_pm2.organizations.append(t2)
    t2_pmo.organizations.append(t2)
    db.flush()

    # =====================================================================
    # PROGRAMS — Tenant 1
    # =====================================================================
    t1_prog1 = Program(
        name="Transformacion Digital", description="Iniciativas de digitalizacion de procesos core",
        status="active", start_date=date(2026, 1, 1), end_date=date(2026, 12, 31),
        organization_id=t1.id, responsible_id=t1_pmo.id, created_by_id=t1_admin.id,
    )
    t1_prog2 = Program(
        name="Eficiencia Operativa", description="Optimizacion de procesos de manufactura",
        status="active", start_date=date(2026, 2, 1), end_date=date(2026, 10, 31),
        organization_id=t1.id, responsible_id=t1_pmo.id, created_by_id=t1_admin.id,
    )
    t1_prog3 = Program(
        name="Cumplimiento Regulatorio", description="Proyectos de cumplimiento fiscal y normativo",
        status="active", start_date=date(2026, 1, 1), end_date=date(2026, 6, 30),
        organization_id=t1.id, responsible_id=t1_admin.id, created_by_id=t1_admin.id,
    )
    db.add_all([t1_prog1, t1_prog2, t1_prog3])

    # =====================================================================
    # PROGRAMS — Tenant 2
    # =====================================================================
    t2_prog1 = Program(
        name="Plataforma Cloud", description="Migracion y modernizacion de infraestructura cloud",
        status="active", start_date=date(2026, 1, 15), end_date=date(2026, 11, 30),
        organization_id=t2.id, responsible_id=t2_pmo.id, created_by_id=t2_admin.id,
    )
    t2_prog2 = Program(
        name="Productos Digitales", description="Desarrollo de productos SaaS para clientes",
        status="active", start_date=date(2025, 10, 1), end_date=date(2026, 9, 30),
        organization_id=t2.id, responsible_id=t2_pmo.id, created_by_id=t2_admin.id,
    )
    db.add_all([t2_prog1, t2_prog2])
    db.flush()

    # =====================================================================
    # PROJECTS — Tenant 1: Grupo Alfa (6 projects)
    # =====================================================================
    t1_projects = [
        Project(folio="PRJ-2026-001", name="Migracion ERP SAP", type="Tecnologia", priority="Alta",
                phase="Ejecucion", health="yellow", start_date=date(2026, 1, 15), end_date=date(2026, 8, 30),
                budget=2500000, real_budget=1800000, progress=65, planned_progress=70,
                organization_id=t1.id, program_id=t1_prog1.id, pm_id=t1_pm1.id, created_by_id=t1_admin.id),
        Project(folio="PRJ-2026-003", name="Automatizacion Nomina", type="Procesos", priority="Media",
                phase="Planificacion", health="green", start_date=date(2026, 3, 1), end_date=date(2026, 9, 30),
                budget=800000, real_budget=120000, progress=15, planned_progress=20,
                organization_id=t1.id, program_id=t1_prog2.id, pm_id=t1_pm1.id, created_by_id=t1_admin.id),
        Project(folio="PRJ-2026-007", name="Data Warehouse Analytics", type="Tecnologia", priority="Media",
                phase="Planificacion", health="green", start_date=date(2026, 3, 15), end_date=date(2026, 12, 31),
                budget=1800000, real_budget=95000, progress=10, planned_progress=12,
                organization_id=t1.id, program_id=t1_prog1.id, pm_id=t1_pm2.id, created_by_id=t1_admin.id),
        Project(folio="PRJ-2026-009", name="Sistema Facturacion 4.0", type="Regulatorio", priority="Alta",
                phase="Ejecucion", health="green", start_date=date(2026, 1, 10), end_date=date(2026, 4, 30),
                budget=450000, real_budget=310000, progress=70, planned_progress=65,
                organization_id=t1.id, program_id=t1_prog3.id, pm_id=t1_pm2.id, created_by_id=t1_admin.id),
        Project(folio="PRJ-2026-010", name="Optimizacion Linea Produccion", type="Procesos", priority="Alta",
                phase="Ejecucion", health="red", start_date=date(2026, 2, 1), end_date=date(2026, 7, 31),
                budget=1200000, real_budget=900000, progress=40, planned_progress=60,
                organization_id=t1.id, program_id=t1_prog2.id, pm_id=t1_pm1.id, created_by_id=t1_admin.id),
        Project(folio="PRJ-2025-012", name="Renovacion Infraestructura Red", type="Infraestructura", priority="Alta",
                phase="Cerrado", health="green", start_date=date(2025, 6, 1), end_date=date(2026, 1, 31),
                budget=2100000, real_budget=2250000, progress=100, planned_progress=100,
                organization_id=t1.id, program_id=t1_prog1.id, pm_id=t1_pm2.id, created_by_id=t1_admin.id),
    ]
    db.add_all(t1_projects)

    # =====================================================================
    # PROJECTS — Tenant 2: TechNova (5 projects)
    # =====================================================================
    t2_projects = [
        Project(folio="PRJ-2026-002", name="Portal Clientes B2B", type="Digital", priority="Alta",
                phase="Ejecucion", health="green", start_date=date(2026, 2, 1), end_date=date(2026, 7, 15),
                budget=1200000, real_budget=520000, progress=45, planned_progress=40,
                organization_id=t2.id, program_id=t2_prog2.id, pm_id=t2_pm1.id, created_by_id=t2_admin.id),
        Project(folio="PRJ-2026-004", name="App Movil Ventas", type="Digital", priority="Alta",
                phase="Ejecucion", health="green", start_date=date(2025, 11, 1), end_date=date(2026, 5, 15),
                budget=950000, real_budget=780000, progress=80, planned_progress=75,
                organization_id=t2.id, program_id=t2_prog2.id, pm_id=t2_pm2.id, created_by_id=t2_admin.id),
        Project(folio="PRJ-2026-005", name="Rediseno Website Corporativo", type="Digital", priority="Baja",
                phase="Soporte", health="green", start_date=date(2025, 9, 1), end_date=date(2026, 3, 31),
                budget=350000, real_budget=340000, progress=95, planned_progress=100,
                organization_id=t2.id, program_id=t2_prog2.id, pm_id=t2_pm1.id, created_by_id=t2_admin.id),
        Project(folio="PRJ-2026-006", name="Migracion AWS Multi-Region", type="Infraestructura", priority="Alta",
                phase="Ejecucion", health="yellow", start_date=date(2025, 12, 1), end_date=date(2026, 10, 31),
                budget=3200000, real_budget=1900000, progress=35, planned_progress=50,
                organization_id=t2.id, program_id=t2_prog1.id, pm_id=t2_pm2.id, created_by_id=t2_admin.id),
        Project(folio="PRJ-2026-008", name="Plataforma CI/CD", type="Tecnologia", priority="Media",
                phase="Ejecucion", health="green", start_date=date(2026, 1, 1), end_date=date(2026, 6, 30),
                budget=600000, real_budget=350000, progress=55, planned_progress=60,
                organization_id=t2.id, program_id=t2_prog1.id, pm_id=t2_pm1.id, created_by_id=t2_admin.id),
    ]
    db.add_all(t2_projects)
    db.flush()

    # =====================================================================
    # PROJECT REQUESTS — Tenant 1
    # =====================================================================
    db.add_all([
        ProjectRequest(
            folio="REQ-2026-001", title="Sistema de Gestion de Inventarios",
            description="Implementar sistema para control de inventarios en tiempo real",
            objective="Reducir perdidas por inventario en 30%",
            business_unit="Operaciones", department="Logistica",
            sponsor_name="Director de Operaciones", sponsor_email="ops@grupoalfa.com",
            strategic_alignment="Eficiencia operativa",
            benefits="Reduccion de costos, visibilidad en tiempo real",
            budget=750000, status="in_review", request_date=date(2026, 3, 15),
            requester_name="Roberto Lopez", requester_email="r.lopez@grupoalfa.com",
            requester_id=t1_pm2.id, organization_id=t1.id, created_by_id=t1_pm2.id,
        ),
        ProjectRequest(
            folio="REQ-2026-002", title="Portal de Proveedores",
            description="Portal web para gestion de proveedores y ordenes de compra",
            objective="Digitalizar proceso de compras",
            business_unit="Compras", department="Adquisiciones",
            sponsor_name="Gerente de Compras", sponsor_email="compras@grupoalfa.com",
            strategic_alignment="Transformacion digital",
            benefits="Reduccion de tiempos de compra, trazabilidad",
            budget=500000, status="approved", request_date=date(2026, 2, 20),
            requester_name="Ana Garcia", requester_email="pmo@grupoalfa.com",
            requester_id=t1_pmo.id, organization_id=t1.id, created_by_id=t1_pmo.id,
        ),
        ProjectRequest(
            folio="REQ-2026-003", title="Automatizacion Reportes Financieros",
            description="Automatizar la generacion de reportes financieros mensuales",
            objective="Eliminar procesos manuales de cierre contable",
            business_unit="Finanzas", department="Contabilidad",
            sponsor_name="CFO", sponsor_email="cfo@grupoalfa.com",
            strategic_alignment="Eficiencia operativa",
            benefits="Ahorro de 40 hrs/mes, reduccion de errores",
            budget=300000, status="rejected", request_date=date(2026, 1, 10),
            requester_name="Sofia Martinez", requester_email="viewer@grupoalfa.com",
            requester_id=t1_viewer.id, organization_id=t1.id, created_by_id=t1_viewer.id,
        ),
    ])

    # =====================================================================
    # PROJECT REQUESTS — Tenant 2
    # =====================================================================
    db.add_all([
        ProjectRequest(
            folio="REQ-2026-004", title="Chatbot IA para Soporte",
            description="Implementar chatbot con IA para atencion al cliente 24/7",
            objective="Reducir tickets de soporte nivel 1 en 60%",
            business_unit="Soporte", department="Customer Success",
            sponsor_name="VP de Producto", sponsor_email="producto@technova.com",
            strategic_alignment="Innovacion en producto",
            benefits="Reduccion de costos de soporte, mejor NPS",
            budget=400000, status="in_review", request_date=date(2026, 3, 20),
            requester_name="Diego Morales", requester_email="d.morales@technova.com",
            requester_id=t2_pm2.id, organization_id=t2.id, created_by_id=t2_pm2.id,
        ),
        ProjectRequest(
            folio="REQ-2026-005", title="Data Lake Centralizado",
            description="Consolidar fuentes de datos en un data lake para analytics",
            objective="Habilitar decisiones data-driven",
            business_unit="Tecnologia", department="Data Engineering",
            sponsor_name="CTO", sponsor_email="cto@technova.com",
            strategic_alignment="Plataforma cloud",
            benefits="Mejor analytics, reduccion de silos de datos",
            budget=1500000, status="approved", request_date=date(2026, 2, 1),
            requester_name="Patricia Dominguez", requester_email="pmo@technova.com",
            requester_id=t2_pmo.id, organization_id=t2.id, created_by_id=t2_pmo.id,
        ),
    ])
    db.flush()

    # =====================================================================
    # RISKS — Tenant 1
    # =====================================================================
    db.add_all([
        Risk(folio="RSK-2026-001", title="Retraso en entrega de licencias SAP",
             description="El proveedor puede no entregar a tiempo las licencias requeridas",
             category="Proveedor", probability=4, impact=5, severity=20, status="open",
             identification_date=date(2026, 1, 20),
             project_id=t1_projects[0].id, created_by_id=t1_pm1.id, organization_id=t1.id),
        Risk(folio="RSK-2026-002", title="Rotacion de personal clave",
             description="Riesgo de salida del arquitecto principal del proyecto",
             category="Recurso", probability=3, impact=4, severity=12, status="open",
             identification_date=date(2026, 2, 5),
             project_id=t1_projects[0].id, created_by_id=t1_pm1.id, organization_id=t1.id),
        Risk(folio="RSK-2026-003", title="Cambio en regulacion fiscal",
             description="Posibles cambios en la normativa de facturacion electronica",
             category="Externo", probability=2, impact=5, severity=10, status="open",
             identification_date=date(2026, 1, 15),
             project_id=t1_projects[3].id, created_by_id=t1_pm2.id, organization_id=t1.id),
        Risk(folio="RSK-2026-004", title="Falta de capacitacion en nuevo ERP",
             description="Usuarios finales no capacitados a tiempo para go-live",
             category="Organizacional", probability=3, impact=3, severity=9, status="mitigated",
             identification_date=date(2026, 3, 1),
             project_id=t1_projects[0].id, created_by_id=t1_pm1.id, organization_id=t1.id),
    ])

    # =====================================================================
    # RISKS — Tenant 2
    # =====================================================================
    db.add_all([
        Risk(folio="RSK-2026-005", title="Costos de AWS exceden presupuesto",
             description="Consumo de servicios cloud puede exceder lo estimado",
             category="Financiero", probability=3, impact=4, severity=12, status="open",
             identification_date=date(2026, 1, 20),
             project_id=t2_projects[3].id, created_by_id=t2_pm2.id, organization_id=t2.id),
        Risk(folio="RSK-2026-006", title="Dependencia de API de terceros",
             description="Portal B2B depende de APIs de proveedores que pueden cambiar",
             category="Tecnico", probability=2, impact=4, severity=8, status="open",
             identification_date=date(2026, 2, 10),
             project_id=t2_projects[0].id, created_by_id=t2_pm1.id, organization_id=t2.id),
    ])

    # =====================================================================
    # ISSUES — Tenant 1
    # =====================================================================
    db.add_all([
        Issue(folio="INC-2026-001", title="Integracion API fallando en staging",
              description="Error 500 al conectar con ERP legacy durante migracion",
              type="issue", priority="Alta", status="open",
              report_date=date(2026, 3, 10), commitment_date=date(2026, 3, 20),
              project_id=t1_projects[0].id, created_by_id=t1_pm1.id, organization_id=t1.id),
        Issue(folio="INC-2026-002", title="Servidor de produccion con alto consumo de memoria",
              description="El servidor principal muestra 95% de uso de RAM",
              type="issue", priority="Alta", status="in_progress",
              report_date=date(2026, 3, 12),
              project_id=t1_projects[4].id, created_by_id=t1_pm1.id, organization_id=t1.id),
        Issue(folio="INC-2026-003", title="Definir estandar de documentacion de APIs",
              description="Equipo necesita alinearse en formato OpenAPI vs custom",
              type="decision", priority="Media", status="open",
              report_date=date(2026, 3, 5),
              project_id=t1_projects[2].id, created_by_id=t1_pm2.id, organization_id=t1.id),
    ])

    # =====================================================================
    # ISSUES — Tenant 2
    # =====================================================================
    db.add_all([
        Issue(folio="INC-2026-004", title="Latencia en API de pagos",
              description="Tiempos de respuesta superan 3 segundos en horario pico",
              type="issue", priority="Alta", status="open",
              report_date=date(2026, 3, 8), commitment_date=date(2026, 3, 18),
              project_id=t2_projects[0].id, created_by_id=t2_pm1.id, organization_id=t2.id),
        Issue(folio="INC-2026-005", title="Seleccion de framework para app movil",
              description="Decidir entre React Native vs Flutter para la app",
              type="decision", priority="Media", status="resolved",
              report_date=date(2026, 1, 15), resolution="Se selecciono React Native por expertise del equipo",
              project_id=t2_projects[1].id, created_by_id=t2_pm2.id, organization_id=t2.id),
    ])

    # =====================================================================
    # CHANGES — Both Tenants
    # =====================================================================
    db.add_all([
        Change(folio="CHG-2026-001", title="Ampliar alcance modulo de reportes",
               description="Incluir reportes ejecutivos adicionales solicitados por direccion",
               change_type="scope", impact="2 semanas adicionales al cronograma",
               requested_by="Director Comercial", request_date=date(2026, 3, 1),
               status="in_review", project_id=t1_projects[0].id,
               created_by_id=t1_pm1.id, organization_id=t1.id),
        Change(folio="CHG-2026-002", title="Reducir alcance fase 2 de nomina",
               description="Posponer modulo de vacaciones para siguiente release",
               change_type="scope", impact="Ahorro de 3 semanas",
               requested_by="Gerente de RRHH", request_date=date(2026, 3, 10),
               status="approved", project_id=t1_projects[1].id,
               created_by_id=t1_pm1.id, organization_id=t1.id),
        Change(folio="CHG-2026-003", title="Incremento de presupuesto para licencias AWS",
               description="Se requieren instancias adicionales para ambiente de staging",
               change_type="cost", impact="$150,000 MXN adicionales",
               requested_by="Lead DevOps", request_date=date(2026, 2, 25),
               status="approved", project_id=t2_projects[3].id,
               created_by_id=t2_pm2.id, organization_id=t2.id),
    ])

    # =====================================================================
    # DOCUMENTS — Both Tenants
    # =====================================================================
    db.add_all([
        Document(folio="DOC-2026-001", name="Project Charter - Migracion ERP",
                 description="Acta de constitucion del proyecto de migracion SAP",
                 category="plan", file_path="/docs/prj001/charter.pdf", file_type="pdf", file_size=245000,
                 project_id=t1_projects[0].id, uploaded_by_id=t1_admin.id,
                 created_by_id=t1_admin.id, organization_id=t1.id),
        Document(folio="DOC-2026-002", name="Plan de Proyecto ERP",
                 description="Cronograma y plan detallado de la migracion",
                 category="plan", file_path="/docs/prj001/plan.xlsx", file_type="xlsx", file_size=890000,
                 project_id=t1_projects[0].id, uploaded_by_id=t1_pm1.id,
                 created_by_id=t1_pm1.id, organization_id=t1.id),
        Document(folio="DOC-2026-003", name="Arquitectura Portal B2B",
                 description="Documento de arquitectura del portal de clientes",
                 category="plan", file_path="/docs/prj002/arch.pdf", file_type="pdf", file_size=1200000,
                 project_id=t2_projects[0].id, uploaded_by_id=t2_pm1.id,
                 created_by_id=t2_pm1.id, organization_id=t2.id),
        Document(folio="DOC-2026-004", name="Runbook Migracion AWS",
                 description="Procedimiento paso a paso para migracion multi-region",
                 category="plan", file_path="/docs/prj006/runbook.pdf", file_type="pdf", file_size=560000,
                 project_id=t2_projects[3].id, uploaded_by_id=t2_pm2.id,
                 created_by_id=t2_pm2.id, organization_id=t2.id),
    ])

    # =====================================================================
    # LESSONS — Both Tenants
    # =====================================================================
    db.add_all([
        Lesson(folio="LEC-2026-001", title="Importancia del change management temprano",
               description="El equipo de usuarios no fue involucrado desde el inicio causando resistencia",
               category="improvement", project_phase="Ejecucion",
               recommendation="Involucrar a key users desde la fase de planificacion",
               project_id=t1_projects[0].id, recorded_by_id=t1_pm1.id,
               created_by_id=t1_pm1.id, organization_id=t1.id),
        Lesson(folio="LEC-2026-002", title="Prototipos tempranos aceleran aprobacion",
               description="Presentar prototipos clickeables redujo ciclos de feedback significativamente",
               category="success", project_phase="Planificacion",
               recommendation="Crear prototipos en Figma antes de iniciar desarrollo",
               project_id=t2_projects[0].id, recorded_by_id=t2_pm1.id,
               created_by_id=t2_pm1.id, organization_id=t2.id),
    ])

    # =====================================================================
    # MINUTES — Both Tenants
    # =====================================================================
    db.add_all([
        Minute(folio="MIN-2026-001", title="Kickoff Migracion ERP SAP",
               meeting_date=date(2026, 1, 16),
               participants='["Carlos Mendez", "Juan Garcia", "Ana Garcia", "Consultor SAP"]',
               topics="Alcance del proyecto, cronograma, equipo, riesgos iniciales",
               agreements="1. Iniciar discovery en semana 3. 2. Asignar key users por modulo. 3. Reunion semanal los lunes.",
               next_meeting_date=date(2026, 1, 23),
               project_id=t1_projects[0].id, recorded_by_id=t1_pm1.id,
               created_by_id=t1_pm1.id, organization_id=t1.id),
        Minute(folio="MIN-2026-002", title="Sprint Review - Portal B2B Sprint 4",
               meeting_date=date(2026, 3, 8),
               participants='["Maria Rodriguez", "Diego Morales", "Patricia Dominguez", "QA Lead"]',
               topics="Demo de funcionalidades completadas, backlog priorizado, bugs encontrados",
               agreements="1. Corregir bug de login. 2. Priorizar modulo de reportes. 3. Hacer pruebas de carga.",
               next_meeting_date=date(2026, 3, 22),
               project_id=t2_projects[0].id, recorded_by_id=t2_pm1.id,
               created_by_id=t2_pm1.id, organization_id=t2.id),
    ])

    db.flush()

    print("  ============================================")
    print("  Demo data seeded successfully!")
    print("  ============================================")
    print(f"  Tenants: 2 (Grupo Alfa, TechNova Solutions)")
    print(f"  Users: 9 + admin = 10 total")
    print(f"  Programs: 5 (3 + 2)")
    print(f"  Projects: 11 (6 + 5)")
    print(f"  Requests: 5 (3 + 2)")
    print(f"  Risks: 6 (4 + 2)")
    print(f"  Issues: 5 (3 + 2)")
    print(f"  Changes: 3 (2 + 1)")
    print(f"  Documents: 4 (2 + 2)")
    print(f"  Lessons: 2 (1 + 1)")
    print(f"  Minutes: 2 (1 + 1)")
    print()
    print("  Tenant 1 — Grupo Alfa:")
    print("    Admin:   alfa_admin / Alfa123!")
    print("    PMO:     alfa_pmo   / Alfa123!")
    print("    PM:      jgarcia    / Pm1234!")
    print("    PM:      rlopez     / Pm1234!")
    print("    Viewer:  alfa_viewer / View123!")
    print()
    print("  Tenant 2 — TechNova:")
    print("    Admin:   nova_admin  / Nova123!")
    print("    PMO:     nova_pmo    / Nova123!")
    print("    PM:      mrodriguez  / Pm1234!")
    print("    PM:      dmorales    / Pm1234!")


def seed() -> None:
    demo = "--demo" in sys.argv

    # Create all tables
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        if db.query(User).first():
            print("Database already seeded. Skipping.")
            return

        admin, admin_role, pmo_role, pm_role, viewer_role = seed_minimal(db)

        if demo:
            seed_demo(db, admin, admin_role, pmo_role, pm_role, viewer_role)

        db.commit()
        print("Database seeded successfully!")
        print(f"  Mode: {'demo' if demo else 'clean (minimal)'}")
        print("  Super Admin: admin / Admin123!")
        if not demo:
            print("  You can now create organizations and users from the UI.")

    finally:
        db.close()


if __name__ == "__main__":
    seed()
