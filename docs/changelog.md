# Changelog

Todos los cambios notables en este proyecto se documentan aquí.
Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/).

---

## [Unreleased]

### Cambiado
- **Arquitectura de despliegue**: migracion a self-hosted. El backend ahora
  corre en la PC del dueño via Docker Desktop + Cloudflare Tunnel; MySQL y
  frontend estatico permanecen en HostGator. Motivo: el plan HostGator
  disponible no ofrece soporte Python (Application Manager es Node-only y
  no hay Setup Python App / Python Selector). Nueva guia canonica:
  [`docs/deploy-self-hosted.md`](./deploy-self-hosted.md).
- `docs/deploy-flow.md` reescrito para el nuevo workflow (sin cPanel Git
  Version Control, sin Application Manager restart, sin Cron Jobs de
  migracion — ahora es `git pull` + `docker compose up -d --build` en la PC).
- `docker/docker-compose.selfhosted.yml` nuevo: compose slim para
  levantar solo el backend apuntando a MySQL remoto.
- Agent prompts (`backender.md`, `dba.md`) actualizados para reflejar la
  nueva plataforma.

### Archivado (movido a `docs/archive/`)
- `deploy-hostgator.md` — ruta 100% HostGator con Passenger; requiere Setup
  Python App que HostGator shared no ofrece.
- `deploy-render.md` — hibrido Render + HostGator; free tier tiene cold
  starts y sin disco persistente, poco practico.
- `deploy-flow.md` (version previa) — dependia de cPanel Git Version Control
  y Application Manager.
- `backend/passenger_wsgi.py` — entry point Passenger WSGI.

### Removido
- `render.yaml` — blueprint de Render, ruta rechazada.
- `a2wsgi>=1.10.0` de `backend/requirements.txt` — solo se usaba en
  `passenger_wsgi.py`.

---

## [0.2.0] - 2026-03-26

### Agregado
- EP-008: Inteligencia Artificial - Minutas desde transcripción y reportes de avance automatizados (US-027 a US-029)
- EP-009: Integración con Microsoft Project - Importación .mpp/.xml/.xlsx, Gantt chart, gestión de tareas (US-030 a US-032)
- 41 nuevos casos de prueba (TC-124 a TC-164)
- Variables de IA en `.env.example`: Ollama, Claude API, parámetros
- Variables de MS Project en `.env.example`
- ADR-001 actualizado: decisión tomada → FastAPI + React (Vite)

---

## [0.1.0] - 2026-03-26

### Agregado
- Estructura inicial del repositorio
- Documentos de instrucción para 6 agentes: orchestrator, dba, backender, frontender, librarian, archiver
- 7 épicas documentadas con historias de usuario, criterios de aceptación y casos de prueba:
  - EP-001: Login y manejo de usuarios (US-001 a US-005)
  - EP-002: Jerarquía de clientes/proyectos (US-006 a US-008)
  - EP-003: Solicitud de proyectos (US-009 a US-010)
  - EP-004: Dashboard (US-011 a US-013)
  - EP-005: Proyectos (US-014 a US-016)
  - EP-006: Módulos de proyecto (US-017 a US-022)
  - EP-007: Administración (US-023 a US-026)
- 123 casos de prueba documentados (TC-001 a TC-123)
- Glosario bilingüe (español/inglés)
- `.env.example` con variables de configuración
- `.gitignore` configurado
