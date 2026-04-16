# PMO Platform

Plataforma de Project Management Office (PMO) como servicio. Sistema integral para gestionar portafolios de proyectos con dashboards, control de riesgos, minutas con IA y soporte para Microsoft Project.

**Idiomas:** Espanol (primario) | English (secondary)

---

## Stack Tecnologico

| Capa | Tecnologia |
|------|-----------|
| **Frontend** | React 19 + TypeScript + Vite 8 + Tailwind CSS 4 |
| **Backend** | FastAPI + Uvicorn + SQLAlchemy 2.0 + Alembic |
| **Base de Datos** | MySQL 8.0 |
| **IA** | Ollama (Qwen 2.5 7B local) / Claude API (fallback) |
| **Graficas** | Recharts |
| **Iconos** | Lucide React |
| **i18n** | react-i18next (ES/EN) |
| **Auth** | JWT (python-jose) + bcrypt |
| **MS Project** | mpxj (Java) via subprocess |

---

## Estructura del Proyecto

```
pmo_app/
├── backend/
│   ├── app/
│   │   ├── api/            # Endpoints REST (28 routers)
│   │   │   ├── areas.py         # CRUD areas de proyecto
│   │   │   ├── auth.py          # Login + JWT
│   │   │   ├── backlog.py       # Backlog items
│   │   │   ├── changes.py       # Control de cambios
│   │   │   ├── dashboard.py     # KPIs del portafolio
│   │   │   ├── documents.py     # Documentos del proyecto
│   │   │   ├── issues.py        # Incidencias AID
│   │   │   ├── lessons.py       # Lecciones aprendidas
│   │   │   ├── minutes.py       # Minutas + generacion IA
│   │   │   ├── objectives.py    # Objetivos del proyecto
│   │   │   ├── organizations.py # Organizaciones (cascade delete)
│   │   │   ├── programs.py      # Programas (cascade delete)
│   │   │   ├── projects.py      # Portafolio de proyectos
│   │   │   ├── reports.py       # Reportes de avance (auto-generados)
│   │   │   ├── risks.py         # Matriz de riesgos
│   │   │   ├── tasks.py         # Tareas + import .mpp/.xlsx/.csv
│   │   │   └── users.py         # Gestion de usuarios
│   │   ├── auth/            # Seguridad JWT
│   │   ├── models/          # 26+ modelos SQLAlchemy
│   │   ├── schemas/         # Validacion Pydantic
│   │   ├── services/        # AI engine + folio generator
│   │   ├── utils/           # MppToJson.java (MS Project parser)
│   │   ├── config.py        # Configuracion centralizada
│   │   ├── database.py      # Conexion MySQL
│   │   ├── main.py          # App FastAPI (auto-sync schema on startup)
│   │   └── seed.py          # Datos iniciales
│   ├── migrations/          # Alembic + sync_schema.sql
│   ├── lib/                 # mpxj JARs (auto-downloaded)
│   ├── setup_mpp.py         # Descarga mpxj JARs para .mpp
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/      # KpiCard, ProgressBar, PhaseBadge, HealthBadge
│   │   │   ├── layout/      # AppLayout, Sidebar, TopBar
│   │   │   └── project/     # 8 tabs del detalle de proyecto
│   │   ├── pages/           # Dashboard, Projects, ProjectDetail, Login, Minutes, Reports, etc.
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
- **MySQL** 8.0+
- **Java JDK** 11+ (para importacion de archivos .mpp, opcional)
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
# Editar .env con tus credenciales de MySQL y JWT secrets
```

Variables criticas a configurar:
```
DATABASE_URL=mysql+pymysql://pmo_user:tu_password@localhost:3306/pmo_db?charset=utf8mb4
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

# Crear base de datos en MySQL
# (En mysql CLI o DBeaver):
# CREATE DATABASE pmo_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
# CREATE USER 'pmo_user'@'localhost' IDENTIFIED BY 'tu_password';
# GRANT ALL PRIVILEGES ON pmo_db.* TO 'pmo_user'@'localhost';
# FLUSH PRIVILEGES;

# Seed de datos iniciales
python -m app.seed

# Iniciar servidor (el schema se sincroniza automaticamente al arrancar)
uvicorn app.main:app --reload --port 8080
```

### 3b. Soporte para MS Project (.mpp) - Opcional

```bash
# Requiere Java JDK 11+ instalado
java -version

# Opcion 1: Instalar mpxj via pip (recomendado)
pip install mpxj --no-deps

# Opcion 2: Descargar JARs manualmente
cd backend
python setup_mpp.py
```

Con esto podras importar archivos `.mpp`, `.mpx` y `.xml` de Microsoft Project
directamente desde el tab "Informacion" del detalle de proyecto.

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

### Reportes de Avance
- Generacion automatica de reportes HTML desde datos reales del proyecto
- KPIs: avance real vs planeado, presupuesto vs gasto real
- Incluye resumen de tareas, riesgos, incidencias y cambios
- Descargar como HTML (imprimible como PDF desde el navegador)
- Enviar reportes a destinatarios
- Filtrar y ordenar por proyecto o fecha

### Importacion MS Project
- Importar archivos .mpp, .mpx, .xml directamente
- Tambien soporta .xlsx y .csv
- Extrae: nombre, WBS, fechas, duracion, avance, hitos, recursos
- Desde el tab "Informacion" del detalle de proyecto

### Administracion
- Gestion de usuarios con roles y organizaciones
- 4 roles con permisos granulares: Administrador, PMO Manager, Project Manager, Viewer
- 36 permisos (9 modulos x 4 acciones: view, create, edit, delete)
- Organizaciones con cascade delete (org -> programas -> proyectos -> todos los hijos)

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

### Tareas
| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| GET | `/api/tasks` | Listar tareas (filtro por `project_id`) |
| POST | `/api/tasks?project_id={id}` | Crear tarea |
| PATCH | `/api/tasks/{id}` | Actualizar tarea |
| DELETE | `/api/tasks/{id}` | Soft delete |
| POST | `/api/tasks/import-file?project_id={id}` | Importar .mpp/.xlsx/.csv |

### Reportes
| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| GET | `/api/reports` | Listar reportes (filtro por `project_id`) |
| POST | `/api/reports?project_id={id}` | Generar reporte (contenido auto-generado) |
| GET | `/api/reports/{id}` | Obtener detalle |
| PATCH | `/api/reports/{id}` | Actualizar (ej. marcar como enviado) |
| DELETE | `/api/reports/{id}` | Soft delete |
| GET | `/api/reports/{id}/download` | Descargar como HTML |

### Organizaciones y Programas
| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| GET/POST | `/api/organizations` | CRUD organizaciones |
| PATCH/DELETE | `/api/organizations/{id}` | Actualizar/eliminar (cascade) |
| GET/POST | `/api/programs` | CRUD programas |
| PATCH/DELETE | `/api/programs/{id}` | Actualizar/eliminar (cascade) |

### Usuarios
| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| GET | `/api/users` | Listar usuarios |
| POST | `/api/users` | Crear usuario (con roles y organizaciones) |
| PATCH | `/api/users/{id}` | Actualizar |
| DELETE | `/api/users/{id}` | Soft delete |

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

26+ modelos con soft delete (`deleted_at`), timestamps automaticos (`created_at`, `updated_at`).

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
python setup_mpp.py                           # Descargar mpxj JARs

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

## Notas Tecnicas

- **Schema auto-sync**: Al iniciar el backend, `sync_schema.sql` se ejecuta automaticamente para agregar columnas faltantes a tablas existentes (usa `IF NOT EXISTS`).
- **Soft delete**: Todos los modelos usan `deleted_at`. Al eliminar, se marca la fecha en vez de borrar el registro.
- **Cascade delete**: Eliminar una organizacion elimina en cascada programas, proyectos y todos sus hijos (tareas, riesgos, etc.).
- **Windows**: El backend maneja encoding UTF-8 explicitamente para compatibilidad con Windows (cp1252).

---

## Despliegue

Arquitectura vigente: **self-hosted nativo** — backend FastAPI con
Python venv + **uvicorn** corriendo como servicio de Windows (via NSSM) en
la PC del dueño, expuesto al internet via **Cloudflare Tunnel**. Frontend
estatico y MySQL en **HostGator**.

- [`docs/deploy-self-hosted.md`](docs/deploy-self-hosted.md) — guia canonica
  paso a paso (MySQL remoto en cPanel, venv + uvicorn + NSSM en tu PC,
  Cloudflare Tunnel, frontend en `public_html`)
- [`docs/deploy-flow.md`](docs/deploy-flow.md) — estrategia de ramas
  (`dev` → `prod`), cambios de BD y checklist de deploy

Rutas de despliegue historicas (HostGator Passenger, Render, variante con
Docker) archivadas en [`docs/archive/`](docs/archive/README.md) con
instrucciones para revivirlas.

Para desarrollo local all-in-one con contenedores, ver
[`docker/docker-compose.yml`](docker/docker-compose.yml).

---

## Documentacion

Toda la documentacion vive en `docs/`:

| Archivo | Contenido |
|---------|-----------|
| [`docs/setup-guide.md`](docs/setup-guide.md) | Setup de desarrollo local |
| [`docs/deploy-self-hosted.md`](docs/deploy-self-hosted.md) | Deploy self-hosted (PC + Cloudflare Tunnel + HostGator) |
| [`docs/deploy-flow.md`](docs/deploy-flow.md) | Flujo `dev`→`prod` y gestion de migraciones |
| [`docs/demo-guiada.md`](docs/demo-guiada.md) | Guion para demos funcionales |
| [`docs/analisis.md`](docs/analisis.md) | Analisis general de la plataforma |
| [`docs/comparativa-drc.md`](docs/comparativa-drc.md) | Comparativa PMOAAS vs DRC |
| [`docs/changelog.md`](docs/changelog.md) | Historial de cambios |
| [`docs/glossary.md`](docs/glossary.md) | Glosario de terminos |
| [`docs/architecture/`](docs/architecture/) | ADRs de arquitectura |
| [`docs/epics/`](docs/epics/) | Documentacion de epics |
| [`docs/archive/`](docs/archive/) | Rutas de deploy historicas (HostGator Passenger, Render) |

---

## Licencia

**Software propietario - Todos los derechos reservados.**

Este repositorio es publico unicamente con fines de transparencia y referencia.
El codigo NO es open source: no esta permitido usarlo, copiarlo, modificarlo
ni redistribuirlo sin autorizacion escrita de los titulares.

Consulta el archivo [`LICENSE`](LICENSE) para los terminos completos. Para
solicitar una licencia de uso comercial, contacta al propietario del
repositorio.
