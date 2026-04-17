# CLAUDE.md — Guía de agente para PMO App

Este archivo orienta a cualquier agente de IA (o colaborador nuevo) antes de
tocar el repo. Es corto a propósito. El contenido vivo está en los documentos
linkeados.

---

## 1. Documentos de referencia (en orden de lectura)

1. `docs/roadmap.md` — **fuente de verdad** de qué falta. Issues por severidad
   (C1–C6, H1–H8, L1–L5) + fases. Antes de proponer trabajo nuevo, revisar si
   ya está listado.
2. `docs/architecture/production.md` — diagrama puente vs objetivo + plan de
   migración de infraestructura.
3. `docs/qa-smoke-checklist.md` — qué probar antes de cada demo.
4. `docs/epics/EP001-EP009.md` — specs funcionales ya implementadas.

---

## 2. Branch y flujo de trabajo

- **Branch activa**: `claude/fix-bcrypt-version-error-4iowB` (histórica del
  fix inicial, quedó como branch de trabajo). Todos los PRs salen de ahí hacia
  `main`.
- **Nunca empujar a `main` directo.**
- **Nunca hacer `--amend` sobre commits ya publicados.**
- Commits en español corto imperativo: `fix(...)`, `feat(...)`, `docs(...)`,
  `chore(...)`. Ejemplo: `fix(superadmin): activate tenant context`.

---

## 3. Tracking en GitHub

El proyecto usa la pestaña **Projects** del repo para ejecutar el roadmap.

### Crear issue para trabajo nuevo
- Título: `[<severidad>] <resumen>` — p.ej. `[C1] dashboard-share cross-tenant leak`.
- Severidades válidas: `C1-C6` (crítico), `H1-H8` (alto), `L1-L5` (bajo). Si
  es algo no inventariado, añadirlo primero a `docs/roadmap.md`.
- Labels: `phase-0` / `phase-1` / `phase-2` / `phase-3` / `phase-4` + uno de
  `bug` / `enhancement` / `docs` / `infra`.
- Body: enlazar al archivo + línea. Terminar con `Refs: docs/roadmap.md §<sección>`.

### Mover en el board
- `Todo` → cuando el issue se crea.
- `In progress` → cuando se abre el PR.
- `Done` → cuando el PR mergea a `main` y el item se marca `[DONE]` en
  `docs/roadmap.md`.

### Pull requests
- Título: mismo prefix conventional commit que el último commit.
- Descripción: 3 bullets `## Summary` + checklist `## Test plan`.
- Cerrar issue con `Closes #<n>` en la descripción.
- NO crear PR salvo que el usuario lo pida explícitamente.

---

## 4. Invariantes del código

Antes de editar, recordar:

### Backend (FastAPI)
- **Multi-tenant**: todo endpoint que toca datos de negocio filtra por
  `organization_id == tenant.id`. El tenant viene del `Depends(get_current_tenant)`.
  Si ves una query sin ese filtro, es bug — es exactamente el patrón de C1–C4
  del roadmap.
- **Soft delete**: no usar `.delete()` en registros de negocio. Marcar
  `deleted_at = func.now()` y filtrar `deleted_at.is_(None)` en lecturas.
- **Secretos**: nunca hardcodear en `config.py`. Leer de env. Si el env no
  existe, que el boot falle ruidoso (no default silencioso).
- **Schema**: hasta que entre Alembic (H2), los cambios siguen en
  `backend/migrations/sync_schema.sql`. Documentar en el PR.

### Frontend (React + Vite)
- **Tenant activo**: se guarda en `localStorage['pmo_tenant_id']`. Helpers en
  `services/auth.ts` (`getActiveTenantId` / `setActiveTenantId`).
- **API base**: importar siempre de `services/api.ts`. No duplicar
  `import.meta.env.VITE_API_URL`.
- **Paths absolutos**: usar alias configurados en `vite.config.ts`.

---

## 5. Loggeo de issues encontrados durante el trabajo

Si un agente encuentra un bug que no está en el roadmap:

1. Añadirlo a la tabla correcta de severidad en `docs/roadmap.md` con ID
   consecutivo.
2. Crear issue en GitHub con el ID nuevo.
3. Comentar en el PR actual (si aplica) "logged as #<n>" y seguir con el trabajo
   original. No desviar el scope del PR en curso.

---

## 6. Qué NO hacer

- No crear nuevos documentos en `docs/` sin chequear que no exista uno análogo.
  Reusar > duplicar.
- No introducir dependencias nuevas sin justificación en el commit.
- No ejecutar `git reset --hard`, `git push --force`, `rm -rf`, ni limpiar
  `node_modules/.venv` sin confirmar.
- No correr migraciones contra MySQL de HostGator sin backup previo.
- No commitear `.env`, `*.pem`, `secrets/`.

---

## 7. Cierre obligatorio de cada corrida (hand-off al operador)

El dueño ejecuta el sistema en su PC (servicio NSSM `pmo_app_backend` + IIS /
frontend empacado). Cuando el agente modifica archivos debe **terminar siempre**
el mensaje final con un bloque `## Próximos pasos` que incluya:

1. **Resumen de commits** — SHA + mensaje corto (si es una sola corrida con
   varios commits, listarlos en orden).
2. **Replicación en el ambiente activo** — secuencia exacta de comandos que el
   operador tiene que ejecutar desde su PC. Usar el template:

   ```
   ## Próximos pasos

   ### Commits
   - <sha1> <mensaje>
   - <sha2> <mensaje>

   ### Replicar en ambiente de pruebas (PC personal)
   1. (Si aplica) Abrir/mergear PR: <link o "no se creó PR; pedir al usuario">
   2. `git pull origin <branch>` en la carpeta del repo local
   3. Backend cambiado:
      - `cd backend && .venv\Scripts\activate`
      - `pip install -r requirements.txt` (solo si `requirements.txt` cambió)
      - Si hay cambios de schema: revisar `backend/migrations/sync_schema.sql`
        y respaldar MySQL HostGator antes de reiniciar
      - `nssm restart pmo_app_backend`
   4. Frontend cambiado:
      - `cd frontend && npm install` (solo si `package.json` cambió)
      - `npm run build`
      - Copiar `frontend/dist/*` a `backend/static_frontend/` (o lo que use
        el deploy script)
      - `nssm restart pmo_app_backend` (sirve el bundle estático)
   5. Validar en la URL de ngrok: <qué pantalla probar>
   ```

3. **Omitir pasos que no aplican** (si la corrida solo tocó docs, basta con
   `git pull`; si solo cambió frontend, no reiniciar backend a menos que
   sirva el bundle).
4. **Señalar acciones destructivas explícitamente** (migraciones de schema,
   rotación de secretos, borrado de datos) con el prefijo **⚠ Requiere
   backup previo**.

Si el agente **no** modificó archivos (solo investigó o respondió una
pregunta), puede omitir el bloque.

