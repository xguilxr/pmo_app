# Migración a Railway — plan paso a paso

Este documento describe cómo mover PMOAAS del stack actual (backend Python en
la PC del dueño via NSSM + frontend estático servido por ese mismo backend +
MySQL en HostGator + ngrok como túnel público) a **Railway** como proveedor
único.

Railway cubre todo lo que necesita la plataforma con un solo proyecto:

- **Backend FastAPI** en un servicio basado en Nixpacks (auto-detecta Python).
- **Frontend React** en un servicio estático (Vite `build` → servir `dist/`).
- **Base de datos MySQL** gestionada por Railway (backups diarios, variables
  auto-inyectadas).
- **Volumen persistente** para los uploads de documentos (hasta hoy se guardan
  en disco local junto al backend).
- **Dominio con HTTPS automático** (reemplaza a ngrok) + dominios propios
  cuando lleguen los clientes de marca blanca.

---

## 1. Mapeo del stack actual → Railway

| Componente hoy                                  | Dónde vive                      | Equivalente en Railway            |
|--------------------------------------------------|---------------------------------|-----------------------------------|
| FastAPI (`backend/app`) via NSSM `pmo_app_backend` | PC personal, Windows            | Service `backend` (Python / Nixpacks) |
| Frontend React/Vite bundle estático              | `backend/static_frontend/`, servido por el mismo FastAPI | Service `frontend` (Static site) |
| MySQL (`pmo_app_prod`)                           | HostGator shared hosting        | Plugin **MySQL** (vol. gestionado) |
| Uploads (`backend/uploads/`, archivos de tenants)| Disco C: del dueño              | **Volume** montado en `/uploads`  |
| Acceso público                                   | ngrok tunnel → PC personal      | Dominio público `*.up.railway.app` + custom domain |
| Logs                                             | NSSM stdout / archivo plano     | Observability integrado de Railway |
| Backups                                          | Manual via phpMyAdmin           | Daily automatic backups del plugin |

**Qué desaparece del stack**: NSSM, ngrok, la copia estática en
`backend/static_frontend/`, la dependencia del HostGator (a menos que se
quiera conservar como backup).

---

## 2. Preparación antes de migrar

### 2.1 Revisión del código backend

Cambios necesarios antes de pushear (mayoría ya listos, marco lo que falta):

- [x] Leer `DATABASE_URL` de env sin fallback silencioso
      (`backend/app/config.py`).
- [x] Leer `SECRET_KEY` de env, fallar ruidoso si no existe.
- [ ] **Parametrizar** la ruta de uploads via `UPLOAD_DIR` env var
      (default local, Railway lo monta en `/data/uploads`). Revisar en
      `backend/app/api/uploads.py` y `backend/app/api/documents.py`.
- [ ] Asegurar que la app escuche en `$PORT` (Railway lo inyecta) —
      actualizar el `uvicorn` command en el servicio a
      `uvicorn app.main:app --host 0.0.0.0 --port $PORT`.
- [ ] **Health check**: Railway lo necesita. Ya existe
      `GET /api/health` en `app/main.py`; confirmar que devuelva 200 sin
      depender de la BD (o que la BD ya esté lista).

### 2.2 Preparar el frontend

- [ ] Verificar que `VITE_API_URL` se lea del entorno en tiempo de build.
      El service de frontend en Railway pasa `VITE_API_URL` como build arg.
- [ ] Si se decide servir el frontend desde el MISMO servicio backend (en
      vez de dos services), empaquetar igual que hoy (vite build →
      `backend/static_frontend/`) y borrar el service separado.

### 2.3 Secretos que hay que rotar

Antes de migrar, **rotar** los siguientes porque van a quedar en manos de un
nuevo proveedor:

- `SECRET_KEY` (JWT) — generar nueva con `python -c "import secrets; print(secrets.token_urlsafe(64))"`.
- Contraseña del usuario MySQL (Railway genera una nueva automáticamente).
- Si hay API keys de terceros (SMTP cuando exista), rotar también.

⚠ Rotar `SECRET_KEY` invalida todas las sesiones activas. Avisar al dueño
que tendrá que volver a iniciar sesión después del cutover.

---

## 3. Aprovisionar Railway

### 3.1 Proyecto y servicios

1. Crear un proyecto en railway.app:
   `pmoaas` (o el nombre que prefiera el dueño).
2. Conectar el repo de GitHub `xguilxr/pmo_app`.
3. Añadir los servicios:
   - **backend**: Source = `/backend`, build = Nixpacks Python,
     start command = `uvicorn app.main:app --host 0.0.0.0 --port $PORT`.
   - **frontend**: Source = `/frontend`, preset = Static, build command =
     `npm ci && npm run build`, output dir = `dist/`.
     (Opcional si el backend sirve el bundle.)
4. Añadir plugin **MySQL**. Railway genera `MYSQL_URL`,
   `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_USER`, `MYSQL_PASSWORD`,
   `MYSQL_DATABASE`.

### 3.2 Variables de entorno del backend

Copiar en `backend → Variables`:

```
DATABASE_URL=${{ MySQL.MYSQL_URL }}        # referencia al plugin
SECRET_KEY=<nuevo token>
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
UPLOAD_DIR=/data/uploads
CORS_ORIGINS=https://<dominio-frontend>.up.railway.app,https://<dominio-custom>
```

### 3.3 Volumen persistente

1. `backend → Settings → Volumes → New Volume`.
2. Nombre `uploads`, mount path `/data/uploads`.
3. Tamaño inicial 5 GB (ampliable).

### 3.4 Dominio

1. Railway asigna un `pmoaas-backend-production.up.railway.app` automático.
2. Añadir dominio custom (p. ej. `app.pmoaas.com`) en `Settings → Domains`
   si el dueño tiene uno. Apuntar con CNAME según instrucciones de Railway.
3. Configurar HTTPS (automático con Let's Encrypt).

---

## 4. Migrar la base de datos

### 4.1 Dump desde HostGator

Desde la PC del dueño (o cualquier máquina con acceso a HostGator):

```powershell
mysqldump -h <host-hostgator> -u <user> -p --single-transaction \
  --routines --triggers --default-character-set=utf8mb4 \
  pmo_app_prod > pmo_app_prod.sql
```

⚠ **Requiere backup previo**: guardar `pmo_app_prod.sql` en un directorio
seguro antes de importar. Este dump es la única copia recuperable si algo
sale mal en Railway.

### 4.2 Importar en Railway MySQL

1. Obtener `MYSQL_URL` desde Railway (`Plugin MySQL → Connect`).
2. Importar:

   ```bash
   mysql --host=<railway-host> --port=<railway-port> \
     --user=<railway-user> --password=<railway-pwd> \
     --default-character-set=utf8mb4 \
     <railway-db> < pmo_app_prod.sql
   ```

3. Correr `backend/migrations/sync_schema.sql` contra Railway MySQL para
   asegurar columnas nuevas:

   ```bash
   mysql --host=... < backend/migrations/sync_schema.sql
   ```

4. Verificar con un par de queries:
   - `SELECT COUNT(*) FROM users;`
   - `SELECT COUNT(*) FROM organizations;`
   - `SELECT COUNT(*) FROM projects WHERE deleted_at IS NULL;`

### 4.3 Migrar uploads

Los archivos en `backend/uploads/` (PC personal) hay que subirlos al volumen.
Railway expone el volumen via `railway run` + `rsync`:

```bash
# Desde la PC personal con Railway CLI instalado y logueado:
railway link   # seleccionar el servicio backend
railway run rsync -av --progress backend/uploads/ /data/uploads/
```

Alternativa sin CLI: subir un endpoint temporal protegido por superadmin
que reciba un zip y lo descomprima en `/data/uploads`. Pedir al dueño
que lo ejecute después del cutover.

---

## 5. Cutover

Orden recomendado para minimizar downtime (~15 minutos):

1. **Congelar escrituras**: avisar al dueño que nadie debe editar por 30 min.
2. **Último dump** de HostGator (paso 4.1).
3. **Importar** en Railway MySQL (paso 4.2).
4. **Sincronizar uploads** (paso 4.3).
5. **Deploy** backend y frontend en Railway.
6. **Prueba**: abrir `https://<dominio-railway>/` y verificar:
   - Login con un usuario conocido.
   - Listado de tenants (si super admin).
   - Abrir un proyecto con documentos y descargar uno para validar el volumen.
7. **Cortar ngrok**: parar el túnel, detener el servicio NSSM en la PC.
8. **Actualizar DNS** si el dueño tiene dominio custom (apuntar a Railway).
9. **Notificar** a usuarios: nueva URL, cerrar sesión y volver a entrar.

### Rollback

Si algo falla durante el cutover:

1. Detener deploy en Railway (el service queda offline pero el dato está ahí).
2. Reactivar NSSM backend en la PC (`nssm start pmo_app_backend`).
3. Reiniciar ngrok con el mismo subdominio si es posible, o avisar al dueño
   de la URL nueva.
4. HostGator MySQL nunca se tocó (solo leímos el dump), así que los datos
   siguen intactos.

---

## 6. Post-migración

- [ ] Eliminar el servicio NSSM y ngrok de la PC personal (tras 1 semana
      de operación estable).
- [ ] Cancelar HostGator cuando ya no haya copias de respaldo ahí.
- [ ] Configurar backup adicional de Railway MySQL (export diario a S3 si
      se quiere redundancia).
- [ ] Añadir monitoreo básico: Railway ofrece métricas de CPU/RAM/DB por
      defecto; integrar alertas (Discord / email) para `503` del backend.
- [ ] Documentar la URL pública nueva en `docs/roadmap.md` y en el canal
      interno.

---

## 7. Costos estimados (referencia abril 2026)

| Recurso                       | Uso esperado    | Costo mensual (USD)  |
|-------------------------------|------------------|-----------------------|
| Backend service (512 MB RAM)  | 24/7, 1 instancia | ~$5                  |
| Frontend static service       | casi gratis      | <$1                   |
| MySQL plugin (1 GB data)      | 1 proyecto piloto | ~$5                  |
| Volume 5 GB                   | uploads          | ~$0.25                |
| Dominio custom                | (1 × dueño)       | $0 (HTTPS incluido)  |
| **Total**                     |                  | **~$10–12 / mes**     |

Escalar a más tenants: MySQL sube por GB consumido (~$0.25/GB), backend por
hora-instancia. Railway plan `Hobby` cubre hasta ~$5 de crédito gratis; el
resto es pay-as-you-go.

---

## 8. Checklist final

- [ ] Código backend parametriza `UPLOAD_DIR`, `PORT`, `DATABASE_URL`.
- [ ] `SECRET_KEY` rotado y cargado en Railway Variables.
- [ ] Plugin MySQL importado con dump de HostGator.
- [ ] Volume `/data/uploads` creado y poblado con uploads.
- [ ] Services backend + frontend deployados y en verde.
- [ ] Health check `/api/health` verde.
- [ ] Login OK en el dominio de Railway.
- [ ] ngrok y NSSM apagados en la PC.
- [ ] `docs/architecture/production.md` actualizado con el nuevo diagrama.
