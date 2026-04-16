# PMO App — Roadmap & Consolidación

> Documento maestro post-auditoría (2026-04-16). Consolida los hallazgos de 5
> agentes especializados: backend, frontend, base de datos, docs y producción.
> Reemplaza cualquier otro doc de planificación. Cuando algo aquí se ejecute,
> se marca `[DONE]` y se conserva para trazabilidad.

---

## 0. Estado actual — honesto

**Qué funciona**
- Backend FastAPI como servicio NSSM, JWT + multi-tenant por subdominio / header / auto-select.
- Frontend React+Vite mismo origen via `backend/static_frontend`.
- MySQL HostGator remoto, tenant cache de 5 min, logging JSON estructurado.
- Demo publico via ngrok (URL rota si cae la PC).
- 9 epics (EP001-EP009) implementados end-to-end: auth, jerarquía, solicitudes, dashboard, proyectos, módulos, admin, IA, import MS Project.

**Lo que se siente frágil (razones concretas)**
1. Secretos por default en `config.py` (`"change-me-..."`) y `secreto` en historia de git. Si el repo es público o se comparte, el JWT se puede forjar.
2. No hay Alembic. `sync_schema.sql` se reemplaya en cada `nssm restart` — sin rollback, sin historial.
3. Faltan 2 fixes críticos de aislamiento multi-tenant: `/api/dashboard-share/links` y `/api/backlog/{id}` no filtran por `organization_id`. Usuario autenticado puede ver/borrar de otra org.
4. No hay tests (`tests/` vacío). CI corre pero no protege regresiones.
5. Tenant cache in-memory → si escalas a 2 instancias, desincronizadas.
6. Hard-deletes en superadmin rompen auditoría.

---

## 1. Inventario de issues por severidad

### 🔴 Críticas (arreglar esta semana)
| # | Issue | Archivo:línea | Fase |
|---|-------|--------------|------|
| C1 | `/api/dashboard-share/links` no filtra por org (cross-tenant leak) | `backend/app/api/dashboard_share.py:63,108` | 1 |
| C2 | `/api/backlog/{id}` PATCH/DELETE sin verificación de org | `backend/app/api/backlog.py:129,142` | 1 |
| C3 | `/api/programs/{id}` GET/PATCH sin filtro tenant | `backend/app/api/programs.py:49` | 1 |
| C4 | `/api/users/{id}` PATCH/DELETE cross-org | `backend/app/api/users.py` | 1 |
| C5 | Password default `secreto` en historia de git + defaults en `config.py` | `backend/app/config.py:12,25`; commit `a51dd55` | 1 |
| C6 | Superadmin endpoints con `.delete()` en lugar de soft delete | `backend/app/api/superadmin.py` (purge paths) | 1 |

### 🟠 Importantes (antes de producción)
| # | Issue | Archivo | Fase |
|---|-------|---------|------|
| H1 | 30+ FKs sin índice (perf al crecer) | `backend/app/models/*` | 2 |
| H2 | No hay Alembic — schema sync ad-hoc | `backend/migrations/` | 2 |
| H3 | `tests/` vacío — CI no bloquea regresiones | `backend/tests/` | 2 |
| H4 | Sin Sentry / error tracking agregado | N/A | 2 |
| H5 | Sin password policy (se permite `"1"`) | `backend/app/schemas/user.py` | 2 |
| H6 | N+1 en `/programs`, `/projects` listado | `backend/app/api/programs.py:42,56,99` | 2 |
| H7 | 15 fallbacks `localhost:8080` duplicados en componentes | `frontend/src/components/project/*` | 2 |
| H8 | `TaskDependency`, `ResourceWorkLog`, `ResourceAvailability` sin `organization_id` | `backend/app/models/task.py`, `resource.py` | 2 |

### 🟡 Deuda técnica (postergar)
| # | Issue | Esfuerzo | Fase |
|---|-------|---------|------|
| L1 | Tenant switcher en TopBar para super-admin | 2h | 2 |
| L2 | Ruta duplicada `/admin/empresas` → `/admin/organizations` | 10min | 2 |
| L3 | Paginación en listados grandes | 4h | 3 |
| L4 | Redis para tenant cache (multi-instancia) | 1d | 4 |
| L5 | JWT key rotation | 1d | 4 |

---

## 2. Plan por fases

Cada fase entrega valor por sí sola. No empezar la siguiente sin cerrar la anterior.

### Fase 0 — Demo estable (3 días) — `IN PROGRESS`
**Goal**: el demo a tu socio no tiene bugs críticos visibles.
- [x] Fix `/api/superadmin/tenants/{id}/detail` (N+1 + `config_json` None)
- [x] Fix tenant context en frontend para super-admin (commit `3fc1e76`)
- [x] Exception handler global con tracebacks (commit `d574bf8`)
- [x] QA smoke checklist (`docs/qa-smoke-checklist.md`)
- [ ] Recorrido completo del checklist en la URL ngrok — pendiente operador
- [ ] Arreglar cualquier 500 que surja en el recorrido

**Deliverable**: demo verde para compartir.

---

### Fase 1 — Seguridad & aislamiento (1 semana)
**Goal**: cerrar las 6 cross-tenant leaks + rotar secretos antes de exponer.
- [ ] C1-C4: añadir filtro `organization_id == tenant.id` en los 4 endpoints
- [ ] C5: generar nuevos `SECRET_KEY` + `JWT_SECRET`, moverlos a `.env` sin default hardcoded, rotar en prod
- [ ] C6: convertir `.delete()` a `deleted_at = func.now()` + commit en los 3 superadmin purge paths
- [ ] Eliminar `secreto` de `docker-compose.yml` (o aceptar + rotar)

**Deliverable**: pentest básico manual pasa; no cross-tenant access.

---

### Fase 2 — Producción básica (2 semanas)
**Goal**: salir de ngrok + Windows + HostGator shared. URL fija, DB gestionada, CI que protege.

**Infra**:
- [ ] Comprar dominio (~$12/año)
- [ ] Cloudflare DNS (free)
- [ ] Backend en **Render Starter** ($7/mes) o **Fly.io** ($3-10/mes). Docker build existente funciona.
- [ ] DB gestionada: **DigitalOcean MySQL** ($15/mes) o seguir en HostGator con backup cron
- [ ] SendGrid free tier para password reset

**Código**:
- [ ] Generar baseline Alembic desde modelos actuales (H2)
- [ ] `sync_schema.sql` + `_sync_schema_on_startup` → `alembic upgrade head` en `entrypoint`
- [ ] Agregar los 30+ índices en una migración (H1)
- [ ] Agregar `organization_id` a `TaskDependency`, `ResourceWorkLog`, `ResourceAvailability` (H8)
- [ ] Suite pytest mínima: auth, tenant isolation, CRUD core (H3) — target 20 tests
- [ ] Sentry free tier + slack alerts (H4)
- [ ] Password policy min 12 chars / mayúscula / dígito (H5)
- [ ] Centralizar `API_BASE_URL` en frontend (H7)
- [ ] Eliminar ruta duplicada `/admin/empresas` (L2)
- [ ] Tenant switcher en `TopBar` para super-admin (L1)

**Deliverable**: `https://tudominio.com` corriendo en cloud, CI bloquea regresiones, errores en Slack.

---

### Fase 3 — Escalabilidad (si el tráfico lo pide)
- [ ] Paginación en listados (L3)
- [ ] `selectinload` en API routes que tienen N+1 (H6)
- [ ] Cache-Control headers + versioning de bundle
- [ ] Uptime check (UptimeRobot free o Statuspage)

### Fase 4 — Hardening avanzado
- [ ] Redis para tenant cache (multi-instancia) (L4)
- [ ] JWT key rotation con 2 versiones activas (L5)
- [ ] Token blacklist on logout
- [ ] Backup tests trimestral (restaurar a staging)

---

## 3. Propuesta de limpieza de docs

**Ninguna a borrar**, todo conserva valor histórico. Acciones:

### A — Actualizar contenido (4 archivos)
| Doc | Qué cambiar |
|-----|-------------|
| `docs/analisis.md` | Quitar tags `(NUEVO)` en líneas 79-87 y secciones 5.6-5.14 — las features ya están shipped |
| `docs/comparativa-drc.md` | Remplazar strikethroughs `~G1~` por "SHIPPED" o simplificar tabla |
| `docs/changelog.md` | Mover sección `[Unreleased]` a `[2.1.0] - 2026-04-16` (ya se lanzó) |
| `docs/demo-guiada.md` | Verificar endpoints de `Recursos` líneas 192-208 antes de usar en demo |

### B — Archivar (4 archivos → `docs/archive/`)
Razón: son análisis one-shot valiosos pero no onboarding activo.
- `docs/analisis.md` → `docs/archive/analysis-gap-closure.md` (487 líneas)
- `docs/demo-guiada.md` → `docs/archive/demo-guiada-v2.md` (487 líneas)
- `docs/comparativa-drc.md` → `docs/archive/comparativa-drc.md` (151 líneas)
- `docs/changelog.md` → mantener en root pero vaciar `[Unreleased]`

### C — Crear (1 archivo nuevo)
- `docs/go-live-checklist.md` — cierra la brecha ngrok → prod real. 30 checkboxes desde "comprar dominio" hasta "share con stakeholder". Propuesta en reporte del archivista.

### D — Tree final propuesto
```
docs/
├── README.md                     (raíz del repo, ya correcto)
├── setup-guide.md                (dev local)
├── deploy-demo-ngrok.md          (demo temporal)
├── deploy-self-hosted.md         (prod con Cloudflare tunnel)
├── deploy-flow.md                (git dev → prod)
├── go-live-checklist.md          (NUEVO — demo → prod real)
├── qa-smoke-checklist.md         (pre-demo)
├── roadmap.md                    (ESTE ARCHIVO)
├── glossary.md
├── architecture/ADR-001-framework.md
├── architecture/platform-hierarchy-diagram.md
├── epics/EP001-EP009.md          (specs de referencia)
└── archive/                      (legacy: HostGator, Render, analisis)
```

---

## 4. Propuesta de limpieza de código (fuera de bugs)

Solo lo que no está en uso y no agrega valor. **Ninguna acción destructiva sin tu OK.**

### A — Eliminar
- Ruta duplicada en `frontend/src/App.tsx` línea 56: `/admin/empresas` → redirige a `/admin/organizations`. Mantener redirect o borrar ruta.
- Modelo `Permission` en `backend/app/models/role.py` no está referenciado por ningún endpoint. Evaluar si mantener para roadmap futuro o borrar.

### B — Centralizar
- 15 instancias hardcoded de `import.meta.env.VITE_API_URL || 'http://localhost:8080/api'` en `frontend/src/components/project/*.tsx` → importar de `services/api.ts`.

### C — NO se borra
- Todos los routers actuales (138 endpoints) tienen uso frontend confirmado.
- Todos los modelos excepto `Permission` están en uso.
- Todos los componentes de tabs del proyecto son single-use pero necesarios.

---

## 5. Referencia para ir a producción definitiva

**Servidor recomendado (solo dev operator)**: Render.com Starter.
**DB**: DigitalOcean Managed MySQL $15/mes (backups automáticos, point-in-time).
**Dominio + TLS**: Namecheap + Cloudflare (free tier).
**Error tracking**: Sentry free tier (10k eventos/mes).
**Mail**: SendGrid free tier.

**Costo total estimado**: ~$25/mes.

**Checklist completa**: ver `docs/go-live-checklist.md` (a crear en Fase 2).

---

## 6. Próximos pasos sugeridos

1. **Hoy**: `git pull` + rebuild + restart + correr QA smoke checklist en ngrok. Confirmar que los 2 bugs (400 en `/users` y 500 en `/detail`) están resueltos.
2. **Esta semana**: cerrar Fase 1 (6 issues críticos). ~2 días de trabajo.
3. **Próximas 2 semanas**: Fase 2. Compra dominio + Render + Alembic + tests básicos.
4. **Después**: Fase 3/4 según crecimiento.

Cada fase termina con un commit/PR claro + update a este doc marcando `[DONE]`.
