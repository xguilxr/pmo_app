# QA Smoke Checklist — pre-demo

Recorrido manual para verificar que el flujo completo funciona y se
**persiste en la BD** antes de mandar el link a tu socio.

> Tiempo estimado: 25-35 min con un solo operador.
> Pre-requisito: backend corriendo, frontend buildeado y copiado a
> `backend/static_frontend/`, túnel ngrok activo.
> Si algo falla, copia el body del 500 (ahora trae `error_type` y
> `error_message`) y revisa `logs/backend.out.log`.

---

## 0. Pre-vuelo (2 min)

- [ ] `nssm status pmo-backend` → `SERVICE_RUNNING`
- [ ] `Invoke-RestMethod http://127.0.0.1:8080/api/health` → `status: ok`, `database: connected`
- [ ] URL de ngrok abre la SPA en navegador limpio (incognito)
- [ ] DevTools → Network → la primera request a `/api/...` devuelve 200/401, **no** 404 ni CORS

---

## 1. Super Admin (5 min)

Login: `super_admin / Super123!` (o el que tengas seedeado).

- [ ] Login OK, redirige a panel super admin
- [ ] Lista de tenants muestra Alfa y Beta con `user_count` y `project_count` > 0
- [ ] Click en un tenant → **drill-down carga sin 500** (el bug del detail)
- [ ] Pestaña *Usuarios* del tenant lista usuarios con sus roles
- [ ] Crear tenant nuevo *"QA Test"* → aparece en la lista, devuelve credenciales del admin generado
- [ ] Editar el tenant *"QA Test"* (cambiar color primario) → recarga muestra el cambio
- [ ] Logout

---

## 2. Tenant Admin — Alfa (8 min)

Login: `alfa_admin / Alfa123!`.

- [ ] Dashboard carga con KPIs (no en blanco, no spinners infinitos)
- [ ] **Programas** → ver lista; entrar a uno; ver proyectos asociados
- [ ] **Crear programa** *"QA Programa"* → aparece en lista, refresh persiste
- [ ] **Crear proyecto** dentro del programa nuevo:
  - nombre, fechas, presupuesto, PM asignado
  - aparece con folio asignado automáticamente
- [ ] **Editar proyecto** → cambiar fase / health → guardar → reload mantiene cambio
- [ ] **Subir documento** al proyecto (PDF chico) → aparece en *Documentos*
- [ ] **Crear minuta** → guardar acción/acuerdo → aparece en lista
- [ ] **Crear riesgo** + asignar dueño + cambiar status
- [ ] **Eliminar** el proyecto QA (soft delete) → desaparece de la lista pero queda en BD con `deleted_at`

---

## 3. Project Manager (5 min)

Login con un PM del seed (ej. `alfa_pm1 / Pm123!`).

- [ ] Solo ve proyectos donde está asignado (no toda la org)
- [ ] Puede actualizar `progress` y `planned_progress`
- [ ] Crea un *project status report* semanal → se guarda
- [ ] Intenta entrar al panel super admin → **403** (no debe funcionar)

---

## 4. Solicitudes (Project Requests) (4 min)

Login: cualquier solicitante.

- [ ] Crear solicitud nueva con todos los campos obligatorios
- [ ] Aparece en bandeja del aprobador con status `pending`
- [ ] Login como aprobador → aprueba → status cambia a `approved`
- [ ] Convertir solicitud aprobada en proyecto → aparece nuevo proyecto enlazado al `request_id`

---

## 5. Permisos / multi-tenant (3 min)

- [ ] Login como `alfa_admin` → no ve proyectos de Beta
- [ ] Cambia el header `X-Tenant-ID` a uno de Beta en DevTools → backend responde **403**
- [ ] Logout, login como `beta_admin` → ve datos de Beta, no de Alfa
- [ ] Super admin con `X-Tenant-ID: 1` ve Alfa, con `X-Tenant-ID: 2` ve Beta

---

## 6. Persistencia post-restart (2 min)

```powershell
nssm restart pmo-backend
Start-Sleep 5
```

- [ ] Recarga el navegador → todo lo que creaste en pasos 1-4 sigue ahí
- [ ] Logs de `backend.out.log` no muestran `ERROR` ni stack traces nuevos

---

## 7. Verificación directa en BD (3 min, opcional pero recomendable)

Conéctate a HostGator MySQL y corre:

```sql
SELECT COUNT(*) FROM organizations WHERE deleted_at IS NULL;
SELECT COUNT(*) FROM users WHERE deleted_at IS NULL;
SELECT COUNT(*) FROM projects WHERE deleted_at IS NULL;
SELECT COUNT(*) FROM project_requests;
SELECT COUNT(*) FROM minutes;

-- Verifica que tu tenant QA Test sigue ahí
SELECT id, name, slug, is_active FROM organizations WHERE name LIKE 'QA%';

-- Soft delete del proyecto del paso 2 — debe tener deleted_at NO NULL
SELECT id, name, deleted_at FROM projects WHERE name = 'QA Programa Project';
```

Si los counts crecieron vs. antes del recorrido y el soft delete tiene
timestamp → la BD está persistiendo. Si no, hay un commit faltante en
algún endpoint.

---

## Si algo falla

1. Mira el body del response: ahora los 500 traen `{error_type, error_message}`.
2. `Get-Content C:\Users\dagui\claude\pmo_app\logs\backend.out.log -Tail 100`
3. Busca `UNHANDLED` para los tracebacks completos.
4. Si es un error de schema (columna inexistente) → revisa
   `backend/migrations/sync_schema.sql` y reinicia para re-correrlo.

---

## Frecuencia recomendada

- **Antes de cada demo al socio**: pasos 0, 1, 2 (10 min).
- **Después de cualquier merge a main**: completo (30 min).
- **Después de cambiar el modelo de datos**: completo + paso 7.
