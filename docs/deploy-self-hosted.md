# Deploy self-hosted: Backend en tu PC (Windows) + HostGator (DB + frontend)

Guia canonica de despliegue vigente. Backend FastAPI corriendo nativamente
en tu PC Windows 24/7, base de datos y sitio estatico en HostGator,
conectado al publico con Cloudflare Tunnel. Sin Docker.

> **¿Solo necesitas exponer la app temporalmente para un demo y aun no
> tienes dominio?** Usa la ruta corta con ngrok:
> [`deploy-demo-ngrok.md`](./deploy-demo-ngrok.md). El backend, NSSM y la
> base de datos en HostGator de esta guia se reusan tal cual; solo cambia
> la capa de exposicion publica.

> Para rutas historicas (HostGator Passenger, Render), ver
> [`docs/archive/`](./archive/README.md).

---

## Arquitectura

```
        Tu PC Windows (encendida 24/7)                 HostGator cPanel
        ┌──────────────────────────────┐               ┌───────────────────────┐
        │                              │               │                       │
        │  Python venv                 │               │  tudominio.com         │
        │   └─ uvicorn :8080           │◄──3306 TCP────┤  MySQL 8.0            │
        │        FastAPI               │               │                       │
        │      (como servicio Windows) │               │  public_html/          │
        │                              │               │   ├─ index.html (SPA) │
        │  Uploads: .\uploads\ (local) │               │   ├─ assets/          │
        │                              │               │   └─ .htaccess        │
        │  cloudflared (Windows svc)   │               │                       │
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
   assets desde `public_html/`.
2. El frontend llama a `https://api.tudominio.com/api/...`.
3. Cloudflare resuelve `api.tudominio.com` → tunnel → tu PC → uvicorn 8080.
4. El backend conecta a `tudominio.com:3306` para MySQL remoto.
5. Uploads guardados en disco local de la PC, servidos por el mismo tunnel.

**Lo que no se expone al internet:**

- El puerto 8080 NO se abre en tu router — Cloudflare Tunnel es saliente.
- Sin DDNS, sin port forwarding, tu IP residencial nunca es publica.

---

## Requisitos

### En tu PC (Windows 10/11)

- **Python 3.11 o 3.12** — <https://www.python.org/downloads/windows/>
  - Durante la instalacion marca **"Add Python to PATH"**
- **Git para Windows** — <https://git-scm.com/download/win>
- **NSSM** (para correr uvicorn como servicio) — descarga en el Paso S.5
- **cloudflared** — descarga en el Paso S.6

### En HostGator

- Plan con **MySQL Databases** y **Remote MySQL** (cualquier shared/reseller)
- Dominio apuntando a HostGator
- Acceso a cPanel

### Cuentas gratis

- Cloudflare — <https://dash.cloudflare.com/sign-up>

---

## Paso S.1 — Base de datos en HostGator

### S.1.1 Crear BD y usuario

1. cPanel → **MySQL Databases**
2. **Create New Database**: `pmo_db` (queda como `tuusuario_pmo_db`)
3. **MySQL Users → Add New User**: `pmo_user`, password fuerte (32+ chars,
   genera en <https://generate-secret.now.sh/32>) — **guardala**
4. **Add User To Database**: marca **ALL PRIVILEGES** → Make Changes

### S.1.2 Habilitar Remote MySQL para tu PC

cPanel → buscador `remote` → **Remote MySQL**.

Camino recomendado (IP publica fija):

1. En tu PC abre <https://whatismyip.com> y copia tu IP publica (v4).
2. En Remote MySQL → **Add Access Host** → pega la IP → **Add Host**.
3. Si tu ISP te cambia la IP (poco comun), repite cuando falle la conexion.

Alternativas si tu IP cambia muy seguido:

- **DDNS**: registra un hostname en <https://www.duckdns.org/> (gratis),
  instala su cliente Windows, y en Remote MySQL agrega el hostname
  (`mipc.duckdns.org`) en vez de una IP.
- **Fallback**: agrega `%` (cualquier IP). Seguridad depende 100% de tu
  password — por eso la pusiste de 32+ chars.

### S.1.3 Datos de conexion

```
Host:     tudominio.com    (NO localhost)
Port:     3306
Database: tuusuario_pmo_db
User:     tuusuario_pmo_user
Password: la_que_generaste
```

---

## Paso S.2 — Preparar el proyecto en tu PC

Abre **PowerShell** (no como administrador).

```powershell
# Carpeta estable — NO uses OneDrive/Desktop sincronizado
mkdir C:\pmo
cd C:\pmo
git clone https://github.com/xguilxr/pmo_app.git
cd pmo_app
git checkout dev
```

A partir de aqui asumimos que el repo vive en `C:\pmo\pmo_app`. Si lo pusiste
en otro lado, ajusta las rutas en el resto de la guia.

---

## Paso S.3 — Crear venv e instalar dependencias

```powershell
cd C:\pmo\pmo_app

# Crear entorno virtual
python -m venv venv

# Activar
.\venv\Scripts\Activate.ps1
```

> Si PowerShell bloquea el script con "execution of scripts is disabled":
> corre una sola vez, como admin:
> `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` y responde `S`.

Con el venv activo (veras `(venv)` al inicio del prompt):

```powershell
python -m pip install --upgrade pip
pip install -r backend\requirements.txt
```

---

## Paso S.4 — Configurar `.env` y primera prueba

```powershell
cd C:\pmo\pmo_app
copy .env.example .env
notepad .env
```

Pega y ajusta:

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

Generar los dos secretos, en PowerShell con el venv activo:

```powershell
python -c "import secrets; print(secrets.token_hex(32))"
```

Ejecuta el comando **dos veces** (uno para `SECRET_KEY`, otro para `JWT_SECRET`).

### Prueba en primer plano

```powershell
cd C:\pmo\pmo_app\backend
python -m uvicorn app.main:app --host 0.0.0.0 --port 8080
```

Espera a ver:
```
INFO:     Uvicorn running on http://0.0.0.0:8080
INFO:     Application startup complete.
```

Desde **otra** terminal PowerShell:

```powershell
curl http://localhost:8080/api/health
```

Debe responder JSON con `"status":"ok"` y `"db_connected":true`. Si falla:

- `db_connected: false` → Remote MySQL en HostGator no permite tu IP, o
  `DATABASE_URL` esta mal. Verifica en la terminal donde corre uvicorn si
  hay traza SQLAlchemy.
- `Test-NetConnection tudominio.com -Port 3306` desde PowerShell debe
  decir `TcpTestSucceeded: True`. Si dice False, tu ISP bloquea 3306 (raro)
  o Remote MySQL no tiene tu IP todavia.

Para el seed inicial (datos demo, solo la primera vez):

```powershell
cd C:\pmo\pmo_app\backend
python -m app.seed --demo
```

Debe imprimir `Database seeded successfully! Super Admin: admin / Admin123!`.

Detiene uvicorn con `Ctrl+C` antes de pasar al siguiente paso.

---

## Paso S.5 — Correr uvicorn como servicio de Windows con NSSM

NSSM (Non-Sucking Service Manager) envuelve cualquier proceso como servicio
de Windows con auto-arranque y reinicio en caso de crash.

### S.5.1 Descargar NSSM

1. Ve a <https://nssm.cc/download> → descarga la release estable
   (`nssm-2.24.zip`).
2. Extrae el ZIP.
3. Copia `nssm-2.24\win64\nssm.exe` a `C:\Windows\System32\` (para tenerlo
   en el PATH).

Verifica:
```powershell
nssm version
```

### S.5.2 Verificar el `.bat` de arranque

El repo ya incluye [`run-backend.bat`](../run-backend.bat) en la raiz, que
activa el venv y arranca uvicorn. No necesitas crearlo manualmente.

Prueba que funciona antes de envolverlo como servicio:

```powershell
cd C:\pmo\pmo_app
.\run-backend.bat
```

Deberias ver los logs de uvicorn (`Application startup complete`). Cierra
con `Ctrl+C` y continua con S.5.3.

### S.5.3 Instalar el servicio

Abre PowerShell **como Administrador** (Win+X → Terminal (Admin)):

```powershell
nssm install pmo-backend
```

Se abre la ventana de NSSM. Llena:

- **Path**: `C:\pmo\pmo_app\run-backend.bat`
- **Startup directory**: `C:\pmo\pmo_app\backend`
- **Service name** (pestana Details): `pmo-backend` (ya prellenado)
- Pestana **I/O** → **Output (stdout)**: `C:\pmo\pmo_app\logs\backend.out.log`
- Pestana **I/O** → **Error (stderr)**: `C:\pmo\pmo_app\logs\backend.err.log`
- Pestana **Exit actions** → **Restart** (ya esta por default)

Crea la carpeta de logs:
```powershell
mkdir C:\pmo\pmo_app\logs
```

Clic en **Install service**.

### S.5.4 Arrancar y verificar

```powershell
nssm start pmo-backend
```

Verifica:
```powershell
nssm status pmo-backend
curl http://localhost:8080/api/health
```

El servicio ya arranca automaticamente al encender la PC (sin necesidad de
iniciar sesion, porque corre como Local System).

### S.5.5 Comandos utiles

```powershell
nssm stop pmo-backend           # Parar
nssm restart pmo-backend        # Reiniciar (tras git pull)
nssm status pmo-backend         # Ver estado
nssm edit pmo-backend           # Editar config
nssm remove pmo-backend confirm # Desinstalar
```

Para ver logs:
```powershell
Get-Content C:\pmo\pmo_app\logs\backend.out.log -Tail 50 -Wait
```

---

## Paso S.6 — Cloudflare: mover DNS y crear el tunnel

### S.6.1 Agregar el dominio a Cloudflare

1. <https://dash.cloudflare.com/> → **Add a site** → `tudominio.com` →
   plan **Free**.
2. Cloudflare importa tus DNS de HostGator automaticamente. Revisa que
   esten todos (`A` del dominio, `MX` de email, etc.). Confirma.
3. Cloudflare te da **2 nameservers** (tipo `ana.ns.cloudflare.com`).

### S.6.2 Cambiar nameservers en tu registrador

Portal HostGator → Domains → Manage → Nameservers. Reemplaza los de
HostGator por los 2 de Cloudflare. Propagacion: normalmente <30 min,
maximo 24 h. Cloudflare te manda email cuando lo detecta.

> HostGator sigue hospedando los archivos, el email y la BD — solo el DNS
> lo manda Cloudflare. cPanel no se afecta.

### S.6.3 Instalar cloudflared

1. Descarga <https://github.com/cloudflare/cloudflared/releases/latest> →
   `cloudflared-windows-amd64.msi` → instala.
2. PowerShell **como Administrador**:
   ```powershell
   cloudflared tunnel login
   ```
   Se abre el navegador → elige `tudominio.com` → autoriza.

### S.6.4 Crear el tunnel

```powershell
cloudflared tunnel create pmo-backend
```

Salida:
```
Created tunnel pmo-backend with id <UUID>
```

**Anota el UUID**.

### S.6.5 Configurar el tunnel

Crea `C:\Users\<tu-usuario>\.cloudflared\config.yml` con:

```yaml
tunnel: <UUID>
credentials-file: C:\Users\<tu-usuario>\.cloudflared\<UUID>.json

ingress:
  - hostname: api.tudominio.com
    service: http://localhost:8080
  - service: http_status:404
```

Reemplaza `<UUID>` y `<tu-usuario>` por los valores reales.

### S.6.6 Ruta DNS y servicio

```powershell
cloudflared tunnel route dns pmo-backend api.tudominio.com
cloudflared service install
```

El servicio `Cloudflared agent` queda en Services (Win+R → `services.msc`)
con startup **Automatic**.

### S.6.7 Verificar

```powershell
curl https://api.tudominio.com/api/health
```

Debe responder el mismo JSON que `localhost:8080/api/health`.

---

## Paso S.7 — Compilar y subir el frontend a HostGator

En tu PC (no necesita el venv):

```powershell
cd C:\pmo\pmo_app\frontend
npm install
"VITE_API_URL=https://api.tudominio.com/api" | Out-File -Encoding utf8 .env.production
npm run build
Compress-Archive -Path dist\* -DestinationPath dist.zip -Force
```

Sube por cPanel:

1. cPanel → **Administrador de archivos** → `public_html/`.
2. **Cargar** → sube `dist.zip`.
3. Clic derecho sobre `dist.zip` → **Extract**.
4. Si quedo en `public_html/dist/`, entra, selecciona todo → **Mover** a
   `/public_html/`.
5. Borra `dist.zip` y la carpeta `dist/` vacia.

---

## Paso S.8 — `.htaccess` para SPA routing

En `public_html`, activa **Mostrar archivos ocultos** (Configuracion arriba
derecha). Edita (o crea) `.htaccess`:

```apache
RewriteEngine On

RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d

RewriteRule ^ index.html [L]
```

No hay proxy a `/api/*`; el frontend llama directo a `api.tudominio.com`.

---

## Paso S.9 — SSL

- `api.tudominio.com`: HTTPS automatico por Cloudflare.
- `tudominio.com`: Cloudflare dashboard → **SSL/TLS** → **Overview** → modo
  **Full**. Si no tenias Let's Encrypt en HostGator, activalo en cPanel →
  **SSL/TLS Status** → **Run AutoSSL**.

---

## Paso S.10 — Verificar end-to-end

1. `https://api.tudominio.com/api/health` → JSON con `"status":"ok"`.
2. `https://tudominio.com` → pantalla de login.
3. Login con `admin` / `Admin123!`.
4. DevTools → Network: llamadas XHR deben ir a `api.tudominio.com`.

---

## Mantenimiento

### Actualizar el codigo

Abre PowerShell **como Administrador** (NSSM requiere admin para
start/stop):

```powershell
cd C:\pmo\pmo_app
git pull origin dev       # o prod

# Si cambiaron dependencias:
.\venv\Scripts\Activate.ps1
pip install -r backend\requirements.txt
deactivate

# Reinicia el servicio
nssm restart pmo-backend
```

### Actualizar el frontend

```powershell
cd C:\pmo\pmo_app\frontend
npm install              # solo si cambio package.json
npm run build
Compress-Archive -Path dist\* -DestinationPath dist.zip -Force
```

Re-sube a HostGator y extrae (borra los archivos viejos antes o
sobreescribe).

### Ver logs en vivo

```powershell
Get-Content C:\pmo\pmo_app\logs\backend.err.log -Tail 50 -Wait
```

### Backup de uploads

```powershell
robocopy C:\pmo\pmo_app\uploads "D:\Backups\pmo-uploads" /MIR /R:2 /W:5
```

Programa en Task Scheduler para backup diario automatico.

### Backup de MySQL

Desde PowerShell con `mysqldump` (si tienes MySQL Client instalado):

```powershell
$fecha = Get-Date -Format yyyyMMdd
mysqldump -h tudominio.com -u tuusuario_pmo_user -p tuusuario_pmo_db > "C:\pmo\backups\backup_$fecha.sql"
```

HostGator tambien hace backups automaticos (cPanel → **Backup Wizard**).

---

## Troubleshooting

### `nssm start pmo-backend` dice "Access denied"

Abre PowerShell como Administrador. NSSM requiere admin para manipular
servicios.

### El servicio arranca pero se para solo

Revisa los logs:
```powershell
Get-Content C:\pmo\pmo_app\logs\backend.err.log -Tail 100
```

Causas tipicas:
- `.env` no existe o tiene variables invalidas.
- DB no alcanzable — revisa `DATABASE_URL` y Remote MySQL.
- Puerto 8080 ocupado por otro proceso:
  ```powershell
  Get-NetTCPConnection -LocalPort 8080
  ```

### `db_connected: false` en health

- Remote MySQL debe incluir tu IP actual (cambia de vez en cuando).
- `Test-NetConnection tudominio.com -Port 3306` debe dar True.
- Caracteres especiales en el password del `.env`: `@` debe ser `%40`,
  `:` debe ser `%3A`, `/` debe ser `%2F`.

### `cloudflared` service instalado pero `api.tudominio.com` da 1033

El tunnel no esta conectando al backend. Ordena de diagnostico:

```powershell
# 1. Servicio corriendo?
Get-Service cloudflared

# 2. Backend respondiendo localmente?
curl http://localhost:8080/api/health

# 3. Logs del tunnel
Get-Content "$env:ProgramData\cloudflared\cloudflared.log" -Tail 50
```

### CORS error en el navegador

`CORS_ORIGINS` en `.env` debe incluir el dominio exacto (sin slash final):
```
CORS_ORIGINS=["https://tudominio.com","https://www.tudominio.com"]
```

Tras editar `.env`:
```powershell
nssm restart pmo-backend
```

### PC reinicia por Windows Update y queda en pantalla de login

NSSM corre como **Local System**, asi que el backend sigue arriba aunque
nadie haya iniciado sesion. Igual cloudflared como servicio. Lo unico que
puede cortarse si nadie inicia sesion son apps que dependen del perfil
de usuario — el backend no es ese caso. Deberia sobrevivir reinicios.

Para confirmarlo: abre `services.msc` y verifica que `pmo-backend` y
`Cloudflared agent` tengan **Log On As: Local System** y **Startup type:
Automatic**.

### Puerto 8080 en uso tras un crash

```powershell
# Encuentra el PID
Get-NetTCPConnection -LocalPort 8080 | Select-Object OwningProcess

# Matalo (reemplaza PID)
Stop-Process -Id <PID> -Force
```

Luego `nssm start pmo-backend`.

---

## Migracion futura

### Si HostGator habilita Python en tu plan

Ver [`docs/archive/deploy-hostgator.md`](./archive/deploy-hostgator.md).
Pasos principales:

1. Restaurar `backend/passenger_wsgi.py` desde
   `docs/archive/passenger_wsgi.py`.
2. Re-agregar `a2wsgi>=1.10.0` a `backend/requirements.txt`.
3. Seguir la guia archivada (B.0-B.9).
4. Migrar uploads via File Manager.
5. Parar servicios en tu PC: `nssm remove pmo-backend confirm` y
   `cloudflared service uninstall`.
6. Quitar el CNAME `api.tudominio.com` en Cloudflare.

### Mover a un mini-PC / servidor Linux

Sigue los mismos pasos sin NSSM — usa systemd. Hay un ejemplo de unit
file en `scripts/pmo-backend.service`.
