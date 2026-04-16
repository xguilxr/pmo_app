# Deploy self-hosted: Backend en tu PC (Windows) + HostGator (DB + frontend)

Guia canonica de despliegue vigente. Esta arquitectura mantiene el backend
FastAPI corriendo en tu PC 24/7, la base de datos y el sitio estatico en
HostGator, y conecta los dos extremos con Cloudflare Tunnel. Es la ruta
mas simple y estable cuando HostGator no soporta Python en tu plan.

> Para rutas historicas (HostGator Passenger, Render), ver
> [`docs/archive/`](./archive/README.md).

---

## Arquitectura

```
        Tu PC Windows (encendida 24/7)                 HostGator cPanel
        ┌──────────────────────────────┐               ┌───────────────────────┐
        │                              │               │                       │
        │  Docker Desktop               │               │  tudominio.com         │
        │   └─ pmo-backend (:8080)     │◄──3306 TCP────┤  MySQL 8.0            │
        │        FastAPI + Uvicorn     │               │                       │
        │                              │               │  public_html/          │
        │  Uploads: ./uploads/ (local) │               │   ├─ index.html (SPA) │
        │                              │               │   ├─ assets/          │
        │  cloudflared (Windows svc)   │               │   └─ .htaccess        │
        │   └─ tunnel → api.tudominio.com              │                       │
        │                              │               └───────────────────────┘
        └──────────────────────────────┘                         ▲
                      ▲                                          │
                      │           ┌──────────────┐               │
                      └───────────┤  Cloudflare  ├───────────────┘
                                  │   (DNS +     │
                                  │    Tunnel)   │
                                  └──────────────┘
```

**Flujo de trafico:**

1. Usuario entra a `https://tudominio.com` → HostGator sirve `index.html` y
   assets (JS/CSS) desde `public_html/`.
2. El frontend hace llamadas a `https://api.tudominio.com/api/...`.
3. Cloudflare resuelve `api.tudominio.com` → tunnel → tu PC → backend 8080.
4. El backend se conecta a `tudominio.com:3306` (MySQL remoto) para datos.
5. Los uploads se guardan en el disco de tu PC y se sirven via el mismo
   tunnel (`api.tudominio.com/api/uploads/...`).

**Lo que no se expone al internet:**

- El puerto 8080 NO se abre en tu router — Cloudflare Tunnel es saliente.
- No hay que configurar DDNS ni port forwarding.
- Tu IP publica residencial NUNCA es visible publicamente.

---

## Requisitos

### En tu PC (Windows 10/11)

- **Docker Desktop** (recomendado) — <https://www.docker.com/products/docker-desktop/>
  - Habilita **"Start Docker Desktop when you log in"** en Settings → General
  - Requiere WSL2 en Windows 10/11 (Docker Desktop lo instala solo)
- **Git para Windows** — <https://git-scm.com/download/win>
- **cloudflared** — se descarga en el paso C.3 abajo
- Conexion a internet estable (banda ancha tipica es suficiente)

### En HostGator

- Plan con **MySQL Databases** y **Remote MySQL** disponibles (cualquier
  shared/reseller)
- Dominio apuntando a HostGator (nameservers de HostGator en tu registrador)
- Acceso a cPanel del usuario destino

### Cuentas gratis adicionales

- Cuenta Cloudflare — <https://dash.cloudflare.com/sign-up>

---

## Paso S.1 — Base de datos en HostGator

### S.1.1 Crear BD y usuario

1. cPanel → **MySQL Databases**
2. **Create New Database**: `pmo_db` (queda como `tuusuario_pmo_db`)
3. **MySQL Users → Add New User**: `pmo_user`, password fuerte (32+ chars,
   genera en <https://generate-secret.now.sh/32>) — **guardala**
4. **Add User To Database**: marca **ALL PRIVILEGES** → Make Changes

### S.1.2 Habilitar conexiones remotas desde tu PC

cPanel → buscador `remote` → **Remote MySQL**.

Hay dos caminos; elige uno:

**Camino A (recomendado) — IP publica fija:**

1. Desde tu PC abre <https://whatismyip.com> y copia tu IP publica (v4).
2. En Remote MySQL, **Add Access Host**: pega la IP tal cual → **Add Host**.
3. Si tu ISP cambia la IP ocasionalmente (cada varios meses), repite el paso
   cuando falle la conexion.

**Camino B — IP dinamica via DDNS:**

Si tu IP cambia seguido:

1. Registrate en <https://www.duckdns.org/> (login con Google/GitHub, gratis).
2. Elige un subdominio, p.ej. `mipc.duckdns.org`.
3. Instala el cliente Windows (<https://www.duckdns.org/install.jsp> → Windows)
   — corre en background y actualiza tu IP en DuckDNS cada 5 min.
4. En Remote MySQL de HostGator, **Add Access Host**: `mipc.duckdns.org`.

**Camino C (fallback) — permitir cualquier host:**

Si A y B no funcionan: **Add Access Host**: `%` (cualquier IP). La seguridad
queda dependiendo 100% de la password — por eso la generaste de 32+ chars.

### S.1.3 Datos de conexion que usaras

```
Host:     tudominio.com    (NO localhost — desde tu PC es remoto)
Port:     3306
Database: tuusuario_pmo_db
User:     tuusuario_pmo_user
Password: la_que_generaste_en_S.1.1
```

Cadena SQLAlchemy:
```
mysql+pymysql://tuusuario_pmo_user:TU_PASSWORD@tudominio.com:3306/tuusuario_pmo_db?charset=utf8mb4
```

---

## Paso S.2 — Clonar el repo en tu PC

Abre PowerShell como usuario normal:

```powershell
# Elige una carpeta estable (no Downloads ni OneDrive)
cd C:\Users\<tu-usuario>\Projects
git clone https://github.com/xguilxr/pmo_app.git
cd pmo_app

# Branch que vas a desplegar (prod cuando este lista; dev para pruebas)
git checkout dev
```

> **Evita OneDrive/Google Drive** para la carpeta del proyecto — los uploads
> y la BD temporal chocan con la sincronizacion.

---

## Paso S.3 — Configurar `.env`

```powershell
copy .env.example .env
notepad .env
```

Edita con estos valores (reemplaza lo que este en mayusculas):

```env
APP_ENV=production
DEBUG=false

SECRET_KEY=STRING_DE_64_CARACTERES_HEX
JWT_SECRET=OTRO_STRING_DE_64_CARACTERES_HEX
JWT_EXPIRATION_HOURS=24

DATABASE_URL=mysql+pymysql://tuusuario_pmo_user:TU_PASSWORD@tudominio.com:3306/tuusuario_pmo_db?charset=utf8mb4
DATABASE_POOL_SIZE=5

HOST=0.0.0.0
PORT=8080

DOMAIN=tudominio.com
CORS_ORIGINS=["https://tudominio.com","https://www.tudominio.com"]

AI_ENABLED=false
AI_DEFAULT_ENGINE=disabled
MPXJ_ENABLED=false

DEFAULT_LOCALE=es
SUPPORTED_LOCALES=es,en

MAX_UPLOAD_SIZE_MB=25
UPLOAD_DIR=./uploads
```

Para generar los secretos, en PowerShell:
```powershell
python -c "import secrets; print(secrets.token_hex(32))"
```
(Ejecuta dos veces, uno para `SECRET_KEY` y otro para `JWT_SECRET`.)

---

## Paso S.4 — Levantar el backend con Docker Compose

Asumiendo Docker Desktop instalado y corriendo.

### S.4.1 Arrancar

```powershell
docker compose -f docker\docker-compose.selfhosted.yml up -d
```

Esto construye la imagen del backend y lo arranca en background escuchando
en `localhost:8080`.

### S.4.2 Verificar que arrancó

```powershell
docker compose -f docker\docker-compose.selfhosted.yml logs -f backend
```

Deberias ver algo como:
```
INFO:     Uvicorn running on http://0.0.0.0:8080
INFO:     Application startup complete.
```

Presiona `Ctrl+C` para salir del log stream (el contenedor sigue corriendo).

Prueba el health endpoint:
```powershell
curl http://localhost:8080/api/health
```

Debe responder JSON con `"status":"ok"` y `"db_connected":true`. Si
`db_connected` es `false`, revisa:
- Que Remote MySQL en HostGator permita tu IP (S.1.2)
- Que `DATABASE_URL` en `.env` apunte a `tudominio.com` (no `localhost`)
- Que el password en `.env` no tenga caracteres que necesiten escape URL
  (`@`, `:`, `/` se deben reemplazar por `%40`, `%3A`, `%2F`)

### S.4.3 Seed inicial (solo la primera vez)

```powershell
docker compose -f docker\docker-compose.selfhosted.yml exec backend python -m app.seed --demo
```

Debe imprimir:
```
Database seeded successfully!
  Mode: demo
  Super Admin: admin / Admin123!
```

---

## Paso S.5 — Cloudflare: mover DNS y crear el tunnel

### S.5.1 Agregar el dominio a Cloudflare

1. Entra a <https://dash.cloudflare.com/> con tu cuenta.
2. **Add a site** → escribe `tudominio.com` → plan **Free**.
3. Cloudflare escanea tus DNS actuales de HostGator y los importa
   automaticamente (revisa que esten todos: `A`, `MX`, `CNAME`). Confirma.
4. Cloudflare te da **2 nameservers** (tipo `ana.ns.cloudflare.com`).

### S.5.2 Cambiar nameservers en tu registrador

Entra al portal donde compraste el dominio (si fue con HostGator: portal
HostGator → Domains → Manage → Nameservers). Reemplaza los nameservers de
HostGator por los 2 de Cloudflare. Propagacion: 5 min a 24 h (normalmente
<30 min).

Cloudflare te manda email cuando detecta el cambio (o recarga el dashboard).

> A partir de aqui, **el DNS del dominio lo maneja Cloudflare**, pero el
> hosting fisico (archivos, email, MySQL) sigue siendo HostGator. Cloudflare
> solo resuelve nombres y sirve de proxy. La UI de cPanel sigue funcionando
> igual que antes.

### S.5.3 Instalar cloudflared en tu PC

1. Descarga el instalador Windows: <https://github.com/cloudflare/cloudflared/releases/latest>
   → busca `cloudflared-windows-amd64.msi`, descarga y ejecuta.
2. Abre PowerShell **como Administrador** (Win+X → Terminal (Admin)).
3. Autentica:
   ```powershell
   cloudflared tunnel login
   ```
   Abre el navegador → elige `tudominio.com` → autoriza. Cierra la pestaña.

### S.5.4 Crear el tunnel

```powershell
cloudflared tunnel create pmo-backend
```

Salida:
```
Created tunnel pmo-backend with id <UUID>
```

**Anota el UUID**.

### S.5.5 Configurar el tunnel

Crea el archivo `C:\Users\<tu-usuario>\.cloudflared\config.yml` con este
contenido (reemplaza `<UUID>` y `<tu-usuario>`):

```yaml
tunnel: <UUID>
credentials-file: C:\Users\<tu-usuario>\.cloudflared\<UUID>.json

ingress:
  - hostname: api.tudominio.com
    service: http://localhost:8080
  - service: http_status:404
```

### S.5.6 Crear la ruta DNS

```powershell
cloudflared tunnel route dns pmo-backend api.tudominio.com
```

Esto agrega un CNAME automatico en Cloudflare apuntando `api.tudominio.com`
al tunnel.

### S.5.7 Probar el tunnel en primer plano

```powershell
cloudflared tunnel run pmo-backend
```

Espera a ver `Registered tunnel connection`. Desde otra terminal:

```powershell
curl https://api.tudominio.com/api/health
```

Debe responder el mismo JSON del health endpoint. Detiene el tunnel con
`Ctrl+C`.

### S.5.8 Instalar como servicio de Windows

Para que cloudflared arranque automaticamente con la PC:

```powershell
# En PowerShell Administrador:
cloudflared service install
```

Verifica en **Services** (Win+R → `services.msc`) que aparezca
`Cloudflared agent` con estado **Running** y startup **Automatic**.

---

## Paso S.6 — Compilar y subir el frontend a HostGator

En tu **PC**:

```powershell
cd frontend
npm install
"VITE_API_URL=https://api.tudominio.com/api" | Out-File -Encoding utf8 .env.production
npm run build
```

Esto genera `frontend/dist/`. Comprimelo:

```powershell
Compress-Archive -Path dist\* -DestinationPath dist.zip -Force
```

Sube el ZIP por cPanel:

1. cPanel → **Administrador de archivos** → `public_html/`.
2. **Cargar** → sube `dist.zip`.
3. Clic derecho sobre `dist.zip` → **Extract**.
4. Si los archivos quedaron en `public_html/dist/`, selecciona todos,
   **Mover** → destino `/public_html/`.
5. Borra `dist.zip` y la carpeta `dist/` vacia.

---

## Paso S.7 — `.htaccess` para SPA

En `public_html`, activa **Mostrar archivos ocultos** (Configuracion arriba
derecha → Show Hidden Files). Edita (o crea) `.htaccess`:

```apache
RewriteEngine On

# Archivos/directorios reales se sirven directo
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d

# Todo lo demas va a index.html (SPA routing de React Router)
RewriteRule ^ index.html [L]
```

No hay regla de proxy a `/api/*` — esas llamadas van a
`api.tudominio.com` directamente por CORS, no pasan por HostGator.

---

## Paso S.8 — SSL

Cloudflare sirve `api.tudominio.com` con HTTPS automatico (incluso si tu
backend solo habla HTTP).

Para `tudominio.com` y `www.tudominio.com`:

1. Cloudflare dashboard → **SSL/TLS** → **Overview** → modo **Full**.
2. Si no tenias SSL en HostGator antes: cPanel → **SSL/TLS Status** → **Run
   AutoSSL** para emitir Let's Encrypt en el origen (HostGator). Cloudflare
   lo valida automaticamente.

---

## Paso S.9 — Verificar end-to-end

1. `https://tudominio.com/api/health` — **NO** debe responder. Es correcto:
   ese path no existe en `public_html`, cae en el SPA rewrite.
2. `https://api.tudominio.com/api/health` — debe responder JSON con
   `"status":"ok"`.
3. `https://tudominio.com` — pantalla de login.
4. Login con `admin` / `Admin123!`.
5. Abre DevTools → Network: las llamadas XHR deben ir a
   `api.tudominio.com`.

---

## Mantenimiento

### Actualizar codigo

En tu PC:

```powershell
cd C:\Users\<tu-usuario>\Projects\pmo_app
git pull origin dev    # o prod, segun la rama desplegada
docker compose -f docker\docker-compose.selfhosted.yml up -d --build
```

El `--build` fuerza rebuild de la imagen con los nuevos archivos; los
volumenes (uploads, tenant_assets) se preservan.

### Actualizar frontend

En tu PC (despues de `git pull`):

```powershell
cd frontend
npm install          # solo si cambiaron dependencias
npm run build
Compress-Archive -Path dist\* -DestinationPath dist.zip -Force
```

Re-sube `dist.zip` por File Manager y reextrae en `public_html/`. Borra los
archivos viejos antes (o sobreescribe).

### Ver logs del backend

```powershell
docker compose -f docker\docker-compose.selfhosted.yml logs -f backend
```

### Reiniciar solo el backend

```powershell
docker compose -f docker\docker-compose.selfhosted.yml restart backend
```

### Parar todo (p. ej. para actualizar Docker Desktop)

```powershell
docker compose -f docker\docker-compose.selfhosted.yml down
```

Al volver a arrancar con `up -d`, los datos persisten (uploads) y la BD
esta en HostGator asi que tampoco se pierde nada.

### Backup de uploads

Los uploads viven en el volumen Docker `uploads` (mapeado a
`./uploads/` del proyecto). Copia esa carpeta periodicamente a un disco
externo o a HostGator via FTP:

```powershell
# Windows: backup simple a OneDrive/externo
robocopy .\uploads "C:\Users\<tu-usuario>\OneDrive\pmo-backups\uploads" /MIR /R:2 /W:5
```

Programa esto en Task Scheduler si quieres backup diario.

### Backup de base de datos

Desde tu PC con `mysqldump` (si tienes el cliente MySQL instalado, o via
Docker):

```powershell
docker run --rm mysql:8.0 mysqldump `
  -h tudominio.com -P 3306 `
  -u tuusuario_pmo_user -pTU_PASSWORD `
  tuusuario_pmo_db > backup_$(Get-Date -Format yyyyMMdd).sql
```

HostGator tambien tiene backups automaticos (cPanel → **Backup Wizard**)
que puedes bajar manualmente.

---

## Troubleshooting

### El backend arranca pero `db_connected: false`

1. En Remote MySQL de cPanel, verifica que tu IP o `%` este en la lista.
2. Desde PowerShell: `Test-NetConnection tudominio.com -Port 3306` — debe
   decir `TcpTestSucceeded: True`. Si falla, tu ISP bloquea el 3306
   saliente (raro pero pasa con ISPs moviles); contacta al ISP o usa VPN.
3. Copia la `DATABASE_URL` de `.env` en una herramienta como DBeaver y
   confirma que conecta desde tu PC antes de pensar que es problema del
   backend.

### Cloudflare Tunnel dice "connection refused"

El backend no esta escuchando en `localhost:8080`. Revisa
`docker compose ps` — debe listar `pmo-backend` con estado `Up`.

### `cloudflared service install` falla con "service already exists"

Ya lo habias instalado antes:
```powershell
cloudflared service uninstall
cloudflared service install
```

### `api.tudominio.com` da 1033 (Argo Tunnel error)

El tunnel no esta corriendo en tu PC. Ve a Services y arranca
`Cloudflared agent`. Si sigue fallando, prueba ejecutar en primer plano
(S.5.7) para ver el error real.

### CORS error en el navegador

`CORS_ORIGINS` en `.env` debe incluir el protocolo y el dominio exacto del
frontend, sin slash final:
```
CORS_ORIGINS=["https://tudominio.com","https://www.tudominio.com"]
```
Reinicia el backend despues de cambiar `.env`.

### PC se reinicio y el sitio esta caido

- Docker Desktop debe estar configurado para arrancar al login (Settings
  → General → **Start Docker Desktop when you log in**).
- El contenedor `pmo-backend` debe tener `restart: unless-stopped` — ya
  viene asi en `docker-compose.selfhosted.yml`.
- Cloudflared debe estar como servicio (Services → `Cloudflared agent`
  → Startup: **Automatic**).

Con los 3 configurados, al encender la PC e iniciar sesion (auto-login
opcional en Windows) todo levanta solo en <2 min.

### Reinicio de la PC sin sesion iniciada

Docker Desktop NO arranca hasta que alguien inicia sesion en Windows. Si
la PC reinicia por Windows Update y queda en la pantalla de login, la app
queda caida. Opciones:

1. Habilitar **auto-login** (netplwiz → desmarcar "Los usuarios deben
   escribir su nombre..." → pon tu password). Riesgo: acceso fisico sin
   password. Solo si la PC esta en un lugar seguro.
2. Postponer Windows Update a horarios controlados (Settings → Windows
   Update → Active hours).
3. Migrar a un mini-PC dedicado (Raspberry Pi, Intel NUC) con Linux y
   Docker corriendo en systemd — sin login interactivo necesario. Ver
   `docker/pmo-backend.service` como referencia.

---

## Migracion futura

### Si HostGator habilita Python en tu plan

Ver [`docs/archive/deploy-hostgator.md`](./archive/deploy-hostgator.md).
Necesitaras:

1. Restaurar `backend/passenger_wsgi.py` desde
   `docs/archive/passenger_wsgi.py`.
2. Re-agregar `a2wsgi>=1.10.0` a `backend/requirements.txt`.
3. Seguir B.0-B.9 de la guia archivada.
4. Migrar uploads: copia el contenido de `./uploads/` de tu PC a
   `/home/tuusuario/pmo_app/uploads/` via File Manager.
5. Apagar el tunnel de tu PC (`cloudflared service uninstall`) y quitar
   el CNAME `api.tudominio.com` en Cloudflare (o apuntarlo al dominio
   HostGator para mantener la URL).

### Mover a un mini-PC / VPS

La guia de `docker/pmo-backend.service` (systemd) cubre el arranque
automatico en Linux. Copia el repo y el `.env`, levanta con
`docker compose`, y repite S.5 (cloudflared) en el nuevo host.
