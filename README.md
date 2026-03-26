# PMO Platform

Plataforma de Project Management Office (PMO) como servicio. Sistema integral para gestionar portafolios de proyectos con dashboards, control de riesgos, minutas con IA y soporte para Microsoft Project.

**Idiomas:** Espanol (primario) | English (secondary)

---

## Stack Tecnologico

| Capa | Tecnologia |
|------|-----------|
| **Frontend** | React 19 + TypeScript + Vite 8 + Tailwind CSS 4 |
| **Backend** | FastAPI + Uvicorn + SQLAlchemy 2.0 + Alembic |
| **Base de Datos** | PostgreSQL 15+ |
| **IA** | Ollama (Qwen 2.5 7B local) / Claude API (fallback) |
| **Graficas** | Recharts |
| **Iconos** | Lucide React |
| **i18n** | react-i18next (ES/EN) |
| **Auth** | JWT (python-jose) + bcrypt |

---

## Estructura del Proyecto

```
pmo_app/
├── backend/
│   ├── app/
│   │   ├── api/            # Endpoints REST (12 routers)
│   │   │   ├── areas.py         # CRUD areas de proyecto
│   │   │   ├── auth.py          # Login + JWT
│   │   │   ├── changes.py       # Control de cambios
│   │   │   ├── dashboard.py     # KPIs del portafolio
│   │   │   ├── documents.py     # Documentos del proyecto
│   │   │   ├── issues.py        # Incidencias AID
│   │   │   ├── lessons.py       # Lecciones aprendidas
│   │   │   ├── minutes.py       # Minutas + generacion IA
│   │   │   ├── objectives.py    # Objetivos del proyecto
│   │   │   ├── projects.py      # Portafolio de proyectos
│   │   │   ├── risks.py         # Matriz de riesgos
│   │   │   └── users.py         # Gestion de usuarios
│   │   ├── auth/            # Seguridad JWT
│   │   ├── models/          # 14 modelos SQLAlchemy
│   │   ├── schemas/         # Validacion Pydantic
│   │   ├── services/        # AI engine + folio generator
│   │   ├── config.py        # Configuracion centralizada
│   │   ├── database.py      # Conexion PostgreSQL
│   │   ├── main.py          # App FastAPI
│   │   └── seed.py          # Datos iniciales
│   ├── migrations/          # Alembic
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/      # KpiCard, ProgressBar, PhaseBadge, HealthBadge
│   │   │   ├── layout/      # AppLayout, Sidebar, TopBar
│   │   │   └── project/     # 8 tabs del detalle de proyecto
│   │   ├── pages/           # Dashboard, Projects, ProjectDetail, Login, Minutes
│   │   ├── data/            # Mock data para desarrollo
│   │   └── i18n/            # Traducciones ES/EN
│   └── package.json
├── docs/
│   ├── architecture/        # ADR-001: Decision de framework
│   ├── epics/               # 9 epics con user stories y test cases
│   ├── setup-guide.md       # Guia completa de instalacion
│   ├── changelog.md         # Historial de versiones
│   └── glossary.md          # Glosario bilingue
├── agents/                  # Instrucciones de agentes de desarrollo
├── .env.example             # Template de variables de entorno
└── .gitignore
```

---

## Requisitos Previos

- **Node.js** 18+ y npm
- **Python** 3.11+
- **PostgreSQL** 15+
- **Ollama** 0.1+ (para IA local, opcional)
- **Git**

Hardware recomendado: 8GB RAM minimo (16GB+ con Ollama), 10GB disco.

---

## Instalacion Rapida

### 1. Clonar el repositorio

```bash
git clone https://github.com/xguilxr/pmo_app.git
cd pmo_app
```

### 2. Configurar variables de entorno

```bash
cp .env.example .env
# Editar .env con tus credenciales de PostgreSQL y JWT secrets
```

Variables criticas a configurar:
```
DATABASE_URL=postgresql://pmo_user:tu_password@localhost:5432/pmo_db
JWT_SECRET=<generar con: python -c "import secrets; print(secrets.token_hex(32))">
SECRET_KEY=<generar otro secreto aleatorio>
```

### 3. Backend

```bash
# Crear entorno virtual (o usar uno existente)
python -m venv venv
source venv/bin/activate          # Linux/Mac
# .\venv\Scripts\activate         # Windows

# Instalar dependencias
cd backend
pip install -r requirements.txt

# Crear base de datos en PostgreSQL
# (En psql o DBeaver):
# CREATE DATABASE pmo_db;
# CREATE USER pmo_user WITH PASSWORD 'tu_password';
# GRANT ALL PRIVILEGES ON DATABASE pmo_db TO pmo_user;
# ALTER DATABASE pmo_db OWNER TO pmo_user;

# Seed de datos iniciales
python -m app.seed

# Iniciar servidor
uvicorn app.main:app --reload --port 8080
```

### 4. Frontend

```bash
cd frontend
npm install
npm run dev
```

### 5. Ollama (opcional, para minutas con IA)

```bash
# Instalar Ollama desde https://ollama.com
ollama pull qwen2.5:7b        # ~4.4GB
# Verificar: curl http://localhost:11434/api/tags
```

---

## URLs de Desarrollo

| Servicio | URL |
|----------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:8080 |
| Swagger Docs | http://localhost:8080/docs |
| ReDoc | http://localhost:8080/redoc |
| Ollama | http://localhost:11434 |

---

## Usuarios de Prueba

| Usuario | Password | Rol |
|---------|----------|-----|
| `admin` | `Admin123!` | Administrador (acceso total) |
| `jgarcia` | `Pm1234!` | Project Manager |
| `mrodriguez` | `Pm1234!` | Project Manager |

---

## Modulos del Sistema

### Dashboard
- 8 KPIs del portafolio (proyectos activos, riesgos, presupuesto, avance)
- 4 graficas: proyectos por fase, avance por fase, presupuesto por tipo, salud del portafolio
- Matriz Plan vs Real

### Proyectos
- Lista con filtros por fase, empresa, folio, tipo, prioridad, rango de fechas
- Vista detalle con 8 tabs:

| Tab | Funcionalidad |
|-----|--------------|
| **Informacion** | Info general, costos (plan vs real), timeline con barra de progreso, objetivos con metas |
| **Areas** | Organigrama del proyecto con responsables, roles (Sponsor, Lider Tecnico, QA Lead, etc.) |
| **Riesgos** | Matriz P x I con severidad, filtros por status, estrategia de mitigacion |
| **Incidencias** | AID (Acciones/Issues/Decisiones), filtros por tipo, prioridad, fecha compromiso |
| **Cambios** | Control de cambios (alcance/tiempo/costo/recurso), workflow de aprobacion |
| **Documentos** | Repositorio de documentos por categoria (plan, reporte, contrato), versionado |
| **Lecciones** | Lecciones aprendidas categorizadas (exito/mejora/error) con recomendacion |
| **Minutas** | Minutas de reunion, vista detalle, badges IA vs Manual |

### Minutas con IA
- Pegar o subir transcripciones (.txt, .srt)
- Generacion automatica con Ollama (Qwen 2.5 7B) o Claude API
- Editar antes de guardar
- Muestra tiempo de generacion y modelo usado

### Administracion
- Gestion de usuarios con roles
- 4 roles con permisos granulares: Administrador, PMO Manager, Project Manager, Viewer
- 36 permisos (9 modulos x 4 acciones: view, create, edit, delete)

---

## API Endpoints

### Autenticacion
| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| POST | `/api/login` | Login con usuario/email + password |

### Proyectos
| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| GET | `/api/projects` | Listar con filtros |
| POST | `/api/projects` | Crear proyecto |
| GET | `/api/projects/{id}` | Obtener detalle |
| PATCH | `/api/projects/{id}` | Actualizar |

### Areas del Proyecto
| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| GET | `/api/projects/{id}/areas` | Listar areas |
| POST | `/api/projects/{id}/areas` | Crear area |
| PATCH | `/api/projects/{id}/areas/{area_id}` | Actualizar |
| DELETE | `/api/projects/{id}/areas/{area_id}` | Eliminar |

### Objetivos del Proyecto
| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| GET | `/api/projects/{id}/objectives` | Listar objetivos |
| POST | `/api/projects/{id}/objectives` | Crear objetivo |
| PATCH | `/api/projects/{id}/objectives/{obj_id}` | Actualizar |
| DELETE | `/api/projects/{id}/objectives/{obj_id}` | Eliminar |

### Modulos (Riesgos, Incidencias, Cambios, Documentos, Lecciones, Minutas)
Cada modulo sigue el patron CRUD:
| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| GET | `/api/{modulo}` | Listar (filtros por `project_id`, `status`) |
| POST | `/api/{modulo}?project_id={id}` | Crear con folio auto-generado |
| GET | `/api/{modulo}/{item_id}` | Obtener detalle |
| PATCH | `/api/{modulo}/{item_id}` | Actualizar |
| DELETE | `/api/{modulo}/{item_id}` | Soft delete |

### Dashboard
| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| GET | `/api/dashboard/kpis` | KPIs del portafolio |

### Minutas IA
| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| POST | `/api/minutes/generate` | Generar minuta desde transcripcion |

---

## Sistema de Folios

Identificadores unicos auto-generados por modulo:

| Prefijo | Modulo | Ejemplo |
|---------|--------|---------|
| PRJ | Proyectos | PRJ-2026-001 |
| REQ | Solicitudes | REQ-2026-001 |
| RSK | Riesgos | RSK-2026-003 |
| INC | Incidencias | INC-2026-001 |
| CHG | Cambios | CHG-2026-001 |
| DOC | Documentos | DOC-2026-004 |
| LEC | Lecciones | LEC-2026-002 |
| MIN | Minutas | MIN-2026-001 |

---

## Modelo de Datos

```
Organization (1) ──── (*) Program (1) ──── (*) Project
                                              │
                      ┌──────┬──────┬─────────┼──────┬──────┬──────┐
                      │      │      │         │      │      │      │
                    Area  Objective Risk    Issue  Change  Doc  Lesson  Minute  Task
                      │                                                         │
                 User (resp.)                                           TaskDependency

User (*) ──── (*) Role (*) ──── (*) Permission
                                     (module + action)
```

14 modelos con soft delete (`deleted_at`), timestamps automaticos (`created_at`, `updated_at`).

---

## Integracion IA

### Arquitectura

```
Frontend (textarea/upload) ──> POST /api/minutes/generate
                                       │
                                  ┌─────┴─────┐
                                  │ ai_engine  │
                                  │  service   │
                                  └─────┬─────┘
                               ┌────────┼────────┐
                         Ollama (local)    Claude API
                        qwen2.5:7b        (fallback)
```

### Configuracion

```env
AI_ENABLED=true
AI_DEFAULT_ENGINE=ollama          # ollama | claude_api
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5:7b
ANTHROPIC_API_KEY=sk-ant-...      # Solo si usas Claude como fallback
AI_TEMPERATURE=0.3
```

---

## Documentacion de Epics

9 epics con 32 user stories y 164 test cases documentados en `docs/epics/`:

| Epic | Descripcion | User Stories | Test Cases |
|------|-------------|:------------:|:----------:|
| EP-001 | Login y Usuarios | US-001 a US-005 | 30 |
| EP-002 | Jerarquia de Clientes | US-006 a US-008 | 13 |
| EP-003 | Solicitud de Proyectos | US-009 a US-010 | 13 |
| EP-004 | Dashboard | US-011 a US-013 | 13 |
| EP-005 | Proyectos | US-014 a US-016 | 19 |
| EP-006 | Modulos del Proyecto | US-017 a US-022 | 22 |
| EP-007 | Administracion | US-023 a US-026 | 13 |
| EP-008 | Inteligencia Artificial | US-027 a US-029 | 19 |
| EP-009 | Microsoft Project | US-030 a US-032 | 22 |

---

## Agentes de Desarrollo

El proyecto define 6 agentes especializados en `agents/`:

| Agente | Responsabilidad |
|--------|----------------|
| **Orchestrator** | Coordinacion y planificacion de tareas |
| **DBA** | Modelado de datos, migraciones, queries |
| **Backender** | APIs REST, servicios, integraciones |
| **Frontender** | Componentes React, paginas, UX |
| **Librarian** | Documentacion, epics, user stories |
| **Archiver** | Limpieza de codigo, estructura del proyecto |

---

## Scripts Utiles

```bash
# Backend
uvicorn app.main:app --reload --port 8080    # Dev server
python -m app.seed                            # Seed database
alembic upgrade head                          # Run migrations
alembic revision --autogenerate -m "msg"      # Create migration

# Frontend
npm run dev                                   # Dev server (Vite)
npm run build                                 # Production build
npm run preview                               # Preview build
npm run lint                                  # ESLint

# Ollama
ollama pull qwen2.5:7b                        # Download model
ollama list                                   # List models
ollama serve                                  # Start server
```

---

## Despliegue

El proyecto esta preparado para despliegue en **Railway**:

1. Crear proyecto en Railway
2. Agregar servicio PostgreSQL
3. Configurar variables de entorno (cambiar `APP_ENV=production`, `DEBUG=false`)
4. Deploy backend y frontend como servicios separados

---

## Licencia

Proyecto privado - Todos los derechos reservados.
