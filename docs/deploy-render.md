# Despliegue hibrido: Backend en Render + Frontend en HostGator

Esta guia se usa cuando **HostGator no soporta Python** en tu plan (Application
Manager es Node.js-only, no hay Setup Python App ni Python Selector). El
backend FastAPI corre en **Render free tier** y el frontend estatico queda en
`public_html` de HostGator. La base de datos puede ser el MySQL de HostGator
(con Remote MySQL habilitado) o una PostgreSQL gratis de Render.

> Para la ruta 100% HostGator con Python habilitado, ver
> [deploy-hostgator.md](./deploy-hostgator.md).

---

## Que cubre el free tier de Render

| Recurso | Free tier | Implicaciones |
|---|---|---|
| RAM | 512 MB | Suficiente para FastAPI + SQLAlchemy + ~20 req/s. |
| CPU | 0.1 vCPU compartida | Latencia aceptable en endpoints simples; OCR/AI pesado se siente. |
| Horas | 750 h/mes | 24/7 = 744 h → entra completo si solo tienes 1 servicio. |
| **Sleep por inactividad** | Si, a los 15 min sin requests | **Cold start ~30-60 s** en el primer request despues de dormir. |
| Bandwidth | 100 GB/mes | Sobra para demos y uso interno. |
| Disco persistente | No en free | El backend NO debe escribir uploads al disco — usa MySQL/S3/Spaces. |
| Build minutes | 500/mes | ~40 deploys/mes sin problema. |
| HTTPS | Automatico en `*.onrender.com` | Dominio custom tambien gratis con CNAME. |
| IP saliente estatica | No en free | **Relevante para whitelist de MySQL**: ver seccion DB abajo. |
| PostgreSQL gratis | 1 GB, 256 MB RAM | **Expira a los 90 dias** y borra datos — no ideal para produccion. |

**Cuando el free tier NO alcanza:**

- Necesitas que el backend responda rapido 24/7 sin cold starts → Starter
  $7/mes (sin sleep, IP saliente estatica).
- Cargas de OCR/AI grandes en concurrencia → Standard $25/mes (mas CPU/RAM).
- Uploads grandes con persistencia en disco → agrega un Disk ($1/GB/mes) o
  mueve uploads a S3.
- Base de datos productiva > 3 meses → PostgreSQL Starter $7/mes o usa la
  de HostGator / un proveedor dedicado.

Para **demo o pruebas internas**, el free tier alcanza perfectamente. Los
15 min de sleep se evitan facil con un cron externo que haga ping cada 10 min
(UptimeRobot gratis, por ejemplo), pero ojo: eso consume tus 750 h/mes mas
rapido si tienes multiples servicios.

---

## Ticket a HostGator para habilitar Python (en paralelo)

Mandalo desde:

1. **Portal HostGator**: <https://portal.hostgator.com/> → *Support* → *Open
   Ticket* (o el boton "Contact" / "Chat").
2. **cPanel directo**: algunos paneles tienen un icono **"Contact Support"**
   o **"Get Help"**.
3. **Email**: `support@hostgator.com` (responde mas lento, 4-24 h).
4. **Chat**: <https://www.hostgator.com/contact> → *Live Chat* (normalmente
   la via mas rapida, 5-15 min).

Texto sugerido (ingles, mas rapido):

> Hi, I need Python application support enabled on my cPanel account
> `tuusuario`. My current Application Manager only shows Node.js and does not
> offer a Python version selector when registering an application. Could you
> please enable **Setup Python App** / **Python Selector** (Passenger Python
> via EasyApache) on my package? I need to deploy a FastAPI backend. Thank you.

En español:

> Hola, necesito habilitar soporte de aplicaciones Python en mi cuenta cPanel
> `tuusuario`. El Application Manager que tengo disponible solo ofrece Node.js
> y no muestra selector de version de Python al registrar una app. ¿Pueden
> habilitar **Setup Python App** / **Python Selector** (Passenger Python via
> EasyApache) en mi paquete? Necesito desplegar un backend FastAPI. Gracias.

Si el ticket se aprueba, puedes migrar el backend de Render a HostGator
siguiendo [deploy-hostgator.md](./deploy-hostgator.md) B.1-B.9. El frontend
no cambia; solo ajustas `VITE_API_URL` y recompilas.

---

## R.1 — Base de datos

Tienes dos opciones. Elige una y sigue el resto con esa decision.

### R.1.a — MySQL de HostGator (recomendado si ya lo tienes)

Ventaja: **no caduca** como la PostgreSQL free de Render.
Desventaja: Render free **no tiene IP saliente estatica**, asi que tienes
que permitir conexiones desde cualquier host (`%`) en Remote MySQL. Es
aceptable para demo con credenciales fuertes; para produccion seria, paga
Render Starter ($7/mes) para tener IP estatica y whitelist puntual.

1. Si aun no la creaste, sigue el **Paso 1** de
   [deploy-hostgator.md](./deploy-hostgator.md) para crear la BD y el usuario.
2. cPanel → buscador → `remote mysql` → abre **Remote MySQL**.
3. En **Add Access Host** agrega `%` (permite cualquier IP). Clic en **Add
   Host**.
   > Si tu cPanel no permite `%` literal, prueba `%.onrender.com`. Si tampoco
   > funciona, agrega rangos de AWS us-west-2 (la region por defecto de Render
   > Oregon) desde <https://ip-ranges.amazonaws.com/ip-ranges.json> filtrando
   > por `"region": "us-west-2"` y `"service": "EC2"`. Es tedioso; `%` suele
   > ser lo mas practico.
4. Asegurate que tu usuario MySQL tiene password fuerte (32+ caracteres,
   generable en <https://generate-secret.now.sh/32>). Con `%` abierto, la
   password es tu unica defensa.
5. Confirma que HostGator acepta conexiones TCP remotas al 3306. Algunos
   planes compartidos lo bloquean a nivel firewall. Si el deploy en R.3 falla
   con timeout al DB, contacta soporte HostGator para abrir 3306 externo, o
   cambia a la opcion R.1.b.

La cadena de conexion queda:

```
mysql+pymysql://tuusuario_pmo_user:TU_PASSWORD@tudominio.com:3306/tuusuario_pmo_db?charset=utf8mb4
```

Nota: `tudominio.com` (no `localhost`) — desde Render el MySQL es remoto.

### R.1.b — PostgreSQL gratis de Render

Solo si HostGator bloquea conexiones remotas al 3306 o prefieres aislarlo.

1. Render Dashboard → **New** → **PostgreSQL** → plan **Free**.
2. Region: **Oregon** (igual que el web service).
3. Copia el **Internal Database URL** (empieza con `postgres://...`).
4. Cambia el driver en la URL a `postgresql+psycopg://` para SQLAlchemy 2.x
   y agrega `psycopg[binary]>=3.1` a `backend/requirements.txt` (el stack
   actual usa PyMySQL, no psycopg, asi que este cambio es obligatorio).

> **Importante**: la PostgreSQL free de Render **se borra a los 90 dias**.
> Reponer datos desde un backup es responsabilidad tuya. Para algo mas
> duradero, considera Supabase (500 MB gratis, sin expiracion) o Neon (512 MB
> gratis, sin expiracion).

Esta guia asume **R.1.a (MySQL HostGator)** en el resto de los pasos.

---

## R.2 — Conectar el repo a Render

1. Entra a <https://dashboard.render.com/> y registra cuenta con GitHub.
2. **New** → **Blueprint**.
3. Conecta el repositorio `xguilxr/pmo_app` (autoriza acceso cuando GitHub lo
   pida).
4. Selecciona la rama que quieras desplegar (p.ej. `dev` para pruebas).
5. Render detecta `render.yaml` en la raiz y muestra el servicio **pmo-api**
   listo para crear. Clic en **Apply**.

---

## R.3 — Configurar las variables secretas en Render

`render.yaml` marca estas variables con `sync: false` — no se commitean y hay
que llenarlas desde el dashboard.

1. Render Dashboard → servicio **pmo-api** → pestaña **Environment**.
2. Edita cada variable:

| Variable | Valor |
|---|---|
| `DATABASE_URL` | `mysql+pymysql://tuusuario_pmo_user:PASSWORD@tudominio.com:3306/tuusuario_pmo_db?charset=utf8mb4` |
| `CORS_ORIGINS` | `["https://tudominio.com","https://www.tudominio.com"]` |
| `DOMAIN` | `tudominio.com` |

3. `SECRET_KEY` y `JWT_SECRET` ya se generaron solos (`generateValue: true`
   en el blueprint). No los toques.
4. Clic en **Save Changes** — Render redeploya automaticamente.

---

## R.4 — Verificar el primer deploy

1. Render → pmo-api → pestaña **Logs**. Espera a ver:
   ```
   INFO:     Uvicorn running on http://0.0.0.0:XXXXX
   INFO:     Application startup complete.
   ```
2. Render te da una URL tipo `https://pmo-api-abc123.onrender.com`. Pruebala:
   ```
   https://pmo-api-abc123.onrender.com/api/health
   ```
   Debe responder JSON con `"status":"ok"` y `"db_connected":true`.
3. Si `db_connected` es `false`: revisa que Remote MySQL permita `%` y que
   `DATABASE_URL` tenga `tudominio.com` (no `localhost`). Los logs de Render
   muestran el error SQLAlchemy exacto.

---

## R.5 — Sembrar datos demo (una sola vez)

Render free tier tiene **Shell** integrada para correr comandos.

1. Render → pmo-api → pestaña **Shell**.
2. Ejecuta:
   ```bash
   python -m app.seed --demo
   ```
3. Deberias ver:
   ```
   Database seeded successfully!
     Mode: demo
     Super Admin: admin / Admin123!
   ```

Si la pestaña Shell no esta disponible en tu plan (a veces requiere
verificacion de cuenta), alternativa: agrega temporalmente un endpoint
protegido `/api/admin/seed` o usa un cron job one-shot. Lo mas rapido es
confirmar la cuenta con tarjeta (no cobra nada en free).

---

## R.6 — Frontend en HostGator apuntando a Render

En tu **maquina local**:

```bash
cd frontend
npm install
echo "VITE_API_URL=https://pmo-api-abc123.onrender.com/api" > .env.production
npm run build
# Comprime dist/ en un ZIP
```

Sube el ZIP por cPanel (igual que B.6 en deploy-hostgator.md):

1. cPanel → **Administrador de archivos** → `/home/tuusuario/public_html`
2. **Upload** → sube `dist.zip` → clic derecho → **Extract**
3. Mueve el contenido de `public_html/dist/` a `public_html/` directamente.
4. Borra `dist.zip` y la carpeta `dist/` vacia.

---

## R.7 — `.htaccess` simplificado (sin proxy al backend)

Como el backend ahora vive en Render (otro dominio), el `.htaccess` solo
maneja el SPA routing. No hay proxy `/api/*` porque el frontend llama
directamente a la URL de Render via CORS.

En `public_html/.htaccess`:

```apache
RewriteEngine On

# Archivos y directorios reales se sirven directo
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d

# Todo lo demas va a index.html (SPA routing)
RewriteRule ^ index.html [L]
```

---

## R.8 — SSL

HostGator ya lo tiene cubierto con Let's Encrypt (busca `ssl` en cPanel).
Render sirve `*.onrender.com` con HTTPS automatico.

Si quieres un dominio custom para el backend (p.ej. `api.tudominio.com`):

1. Render → pmo-api → **Settings** → **Custom Domains** → agrega
   `api.tudominio.com`.
2. En HostGator **DNS Zone Editor** agrega un CNAME:
   ```
   api   CNAME   pmo-api-abc123.onrender.com.
   ```
3. Render emite Let's Encrypt automatico en 2-5 min.
4. Actualiza `VITE_API_URL=https://api.tudominio.com/api` y recompila
   frontend.

---

## R.9 — Verificar end-to-end

1. `https://tudominio.com` → pantalla de login.
2. Login con `admin` / `Admin123!` — primera llamada puede tardar 30-60 s si
   Render estaba dormido.
3. Abre DevTools → Network para confirmar que las llamadas van a
   `*.onrender.com` (o `api.tudominio.com` si configuraste custom domain).

---

## Mantenimiento

- **Redeploy**: cada `git push` a la rama conectada dispara build automatico
  en Render. Ver progreso en pestaña **Events**.
- **Cambiar variables**: Environment tab → Save → redeploy automatico.
- **Rollback**: Render → pmo-api → **Deploys** → clic en un deploy anterior
  → **Rollback to this deploy**.
- **Logs**: pestaña **Logs** (stream en vivo). Para persistencia, conecta un
  drain a Datadog / Papertrail (requiere plan pago).
- **Mantener despierto**: UptimeRobot (<https://uptimerobot.com/>) → agrega
  monitor HTTP a `/api/health` cada 5 min. Asi evitas cold starts en horario
  laboral. Ojo con las 750 h/mes del free tier si tienes mas servicios.
- **Evitar el sleep solo en horario laboral**: usa un monitor con horario
  (UptimeRobot "Paused" via API) para que Render duerma fines de semana y
  ahorres horas.

---

## Migracion futura a HostGator

Cuando soporte habilite Python en tu cPanel:

1. Sigue [deploy-hostgator.md](./deploy-hostgator.md) **B.1-B.5** (omite B.0
   si ya confirmaste el soporte). La BD ya existe, reusala.
2. Seed ya corrio en Render; puedes **omitir B.5** (o correrlo igual, hace
   `IF NOT EXISTS`).
3. Recompila frontend con `VITE_API_URL=https://tudominio.com/api` y re-sube
   a `public_html` (B.6).
4. Restaura `.htaccess` a la version de B.7 (con proxy interno a Python).
5. Apaga el servicio en Render (Dashboard → Settings → **Suspend** o
   **Delete**).
