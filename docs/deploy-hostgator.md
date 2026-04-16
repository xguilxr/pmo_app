# Despliegue en HostGator cPanel - PMOAAS

Guia paso a paso para desplegar la plataforma PMO en un hosting HostGator con cPanel.

Esta guia cubre tanto planes **Shared/Business** (solo cPanel) como planes
**Reseller** (WHM + cPanel).

> **Dos rutas posibles**
>
> - **Ruta A — con SSH local**: si tu plan/reseller te habilita SSH Access en
>   cPanel, sigue la guia completa en orden (Pasos 1-12, incluyendo el Paso 2).
> - **Ruta B — sin SSH, sin Terminal** (HostGator compartido/reseller con la
>   feature SSH deshabilitada): **salta el Paso 2** y usa la seccion
>   [Ruta B: Deploy 100% desde cPanel UI](#ruta-b-deploy-100-desde-cpanel-ui)
>   que usa Git Version Control + Application Manager + Cron Jobs.
>
> **Si tu cPanel NO soporta Python** (Application Manager solo ofrece Node.js,
> sin selector de version de Python al registrar la app), ni Ruta A ni Ruta B
> funcionaran. Usa [deploy-render.md](./deploy-render.md) para desplegar el
> backend en Render free tier con el frontend en HostGator, mientras el
> soporte de HostGator habilita Python (si es que tu plan lo permite).

---

## Requisitos Previos

- Plan de HostGator con acceso a **cPanel** (Business o superior recomendado)
- Dominio configurado apuntando a HostGator
- Python 3.10+ disponible (HostGator lo tiene por defecto)
- Para Ruta A: acceso SSH habilitado (ver Paso 2 — en Reseller se activa desde
  **WHM**, no desde cPanel)
- Para Ruta B: **Application Manager** (o **Setup Python App**) + **Git Version
  Control** + **Cron Jobs** disponibles en cPanel (todos vienen por defecto)

---

## Paso 1: Crear la Base de Datos MySQL

1. Entra a tu **cPanel** (normalmente `tudominio.com/cpanel` o `tudominio.com:2083`)
2. Busca la seccion **Databases** y haz clic en **MySQL Databases**
3. Crea una nueva base de datos:
   - Database Name: `pmo_db` (cPanel le antepone tu usuario, ej: `tuusuario_pmo_db`)
   - Clic en **Create Database**
4. Crea un usuario de base de datos:
   - Username: `pmo_user` (sera `tuusuario_pmo_user`)
   - Password: genera uno seguro y **guardalo**
   - Clic en **Create User**
5. Asigna el usuario a la base de datos:
   - Selecciona el usuario y la BD que creaste
   - Marca **ALL PRIVILEGES**
   - Clic en **Make Changes**

> Anota estos datos, los necesitaras:
> - DB Host: `localhost`
> - DB Name: `tuusuario_pmo_db`
> - DB User: `tuusuario_pmo_user`
> - DB Password: `el_que_generaste`

---

## Paso 2: Habilitar Acceso SSH

> **Importante: WHM vs cPanel**
>
> - **WHM** (WebHost Manager, normalmente puerto **2087**): interfaz de
>   administracion a nivel servidor/reseller. Aqui se **autoriza** el acceso
>   shell para cada cuenta de cPanel.
> - **cPanel** (puerto **2083**): interfaz de la cuenta final. Aqui se
>   **gestionan las llaves** SSH una vez que el shell ya esta habilitado.
>
> Si entras a la URL y ves un menu con secciones como "Account Information",
> "Account Functions", "Server Configuration", "Service Configuration", etc.,
> estas en **WHM**. Si ves "Files", "Databases", "Domains", "Email", estas en
> **cPanel**.

### 2.1 (Solo WHM) Habilitar Shell Access para la cuenta

Si tienes WHM (eres reseller/admin), primero hay que habilitar el shell de la
cuenta cPanel; de lo contrario la opcion "SSH Access" **no aparecera** dentro
de cPanel o aparecera deshabilitada.

1. Entra a WHM: `https://tudominio.com:2087` (o el hostname del servidor)
2. En la barra de busqueda superior izquierda escribe **"shell"**
3. Abre **Manage Shell Access** (ruta: *Home > Account Functions > Manage
   Shell Access*)
4. Localiza la cuenta cPanel a la que vas a desplegar
5. Cambia el dropdown a **Normal Shell** (acceso completo) o **Jailed Shell**
   (recomendado: aislado al home del usuario, suficiente para este deploy)
6. Clic en **Save** (los cambios se aplican de inmediato)

> Si tu plan de HostGator es compartido y no ves WHM, el shell viene
> habilitado por defecto solo en planes Business+. En planes Hatchling/Baby
> normalmente hay que **abrir un ticket** a soporte de HostGator pidiendo
> "habilitar Jailed Shell para mi cuenta cPanel". Suele tomar 5-15 min.

### 2.2 (Opcional WHM) Confirmar que el servicio SSH escucha

Tambien desde WHM puedes verificar/abrir el puerto:

1. Busca **"SSH Configuration"** (*Home > Service Configuration > SSH Password
   Authorization Tweak* o *SSH Server Configuration*)
2. Confirma que el puerto sea **2222** (estandar HostGator) o el que use tu
   servidor
3. Si usas **ConfigServer Firewall (CSF)** y el puerto esta bloqueado: busca
   **"ConfigServer Security & Firewall"** > *Firewall Configuration* > seccion
   `TCP_IN` y agrega `2222`

### 2.3 (cPanel) Generar y autorizar la llave SSH

Ahora si, entra a **cPanel** del usuario destino:
`https://tudominio.com:2083` o `https://tudominio.com/cpanel`

1. En el buscador de cPanel escribe **"ssh"**
2. Abre **SSH Access** (a veces aparece como **Manage SSH Keys** o
   **SSH/Shell Access**, en la seccion **Security**)
3. Clic en **Manage SSH Keys**
4. **Import Key** (recomendado si ya tienes una llave en tu maquina) o
   **Generate a New Key**:
   - Si generas: deja defaults, pon una passphrase, clic en **Generate Key**
5. En la lista de llaves publicas, junto a la nueva llave, clic en **Manage** >
   **Authorize**
6. Si generaste la llave en el servidor, descarga la **privada** desde la misma
   pantalla y guardala en tu maquina como `~/.ssh/hostgator_pmo` con permisos
   `chmod 600`

### 2.4 Probar la conexion

Desde tu maquina local:

```bash
# Si importaste tu llave existente
ssh tuusuario@tudominio.com -p 2222

# Si descargaste la privada generada en el servidor
ssh -i ~/.ssh/hostgator_pmo tuusuario@tudominio.com -p 2222
```

> HostGator usa el puerto **2222** para SSH, no el 22 estandar. Si falla con
> "Connection refused" revisa que el shell este habilitado (Paso 2.1) y el
> firewall permita 2222 (Paso 2.2).

### 2.5 Alternativa rapida: Terminal en cPanel

Si solo quieres ejecutar comandos sin configurar llaves locales, muchos
cPanel tienen un **Terminal** integrado:

1. En cPanel busca **Terminal** (seccion **Advanced**)
2. Acepta el aviso y tendras una shell del servidor en el navegador

Sirve para los pasos 3-8 de esta guia (no para `scp` desde tu maquina, paso 9).

> **Tip Reseller**: Si administras multiples cuentas, puedes crear un alias en
> `~/.ssh/config` para cada una:
>
> ```
> Host pmo-prod
>   HostName tudominio.com
>   Port 2222
>   User tuusuario
>   IdentityFile ~/.ssh/hostgator_pmo
> ```
>
> Luego conectas con `ssh pmo-prod`.

---

## Paso 3: Configurar Python en el Servidor

Conectate por SSH y ejecuta:

```bash
# Verificar version de Python disponible
python3 --version

# Crear directorio del proyecto
mkdir -p ~/pmo_app
cd ~/pmo_app

# Crear entorno virtual
python3 -m venv venv
source venv/bin/activate

# Verificar que pip funciona
pip install --upgrade pip
```

---

## Paso 4: Subir el Codigo al Servidor

### Opcion A: Git (recomendado)

```bash
cd ~
git clone https://github.com/xguilxr/pmo_app.git pmo_app
cd pmo_app
git checkout claude/backend-test-activation-ZIZy6
```

### Opcion B: File Manager de cPanel

1. En cPanel, abre **File Manager**
2. Navega a `/home/tuusuario/pmo_app`
3. Sube el archivo ZIP del proyecto
4. Haz clic derecho > **Extract**

---

## Paso 5: Instalar Dependencias del Backend

```bash
cd ~/pmo_app
source venv/bin/activate

# Instalar dependencias
pip install -r backend/requirements.txt
```

> Si `pip install` falla por memoria, intenta:
> ```bash
> pip install --no-cache-dir -r backend/requirements.txt
> ```

---

## Paso 6: Configurar Variables de Entorno

```bash
cd ~/pmo_app
cp .env.example .env
nano .env
```

Edita estas lineas con tus datos reales:

```env
APP_ENV=production
DEBUG=false
SECRET_KEY=genera-un-string-aleatorio-largo-aqui
JWT_SECRET=otro-string-aleatorio-diferente

# Usa los datos del Paso 1 (con el prefijo de cPanel)
DATABASE_URL=mysql+pymysql://tuusuario_pmo_user:TU_PASSWORD@localhost:3306/tuusuario_pmo_db?charset=utf8mb4

# Tu dominio real
CORS_ORIGINS=["https://tudominio.com","https://www.tudominio.com"]

# Desactivar AI en produccion inicial
AI_ENABLED=false
```

Guarda con `Ctrl+O`, `Enter`, `Ctrl+X`.

> Para generar strings aleatorios puedes usar:
> ```bash
> python3 -c "import secrets; print(secrets.token_hex(32))"
> ```

---

## Paso 7: Inicializar la Base de Datos

```bash
cd ~/pmo_app
source venv/bin/activate

# Crear tablas y seed inicial
cd backend
python -m app.seed --demo
```

Deberias ver:
```
Database seeded successfully!
  Mode: demo
  Super Admin: admin / Admin123!
  ...
```

---

## Paso 8: Configurar la App Python en cPanel

### Opcion A: Setup Python App (si tu plan lo soporta)

1. En cPanel, busca **Software** > **Setup Python App**
2. Clic en **Create Application**:
   - Python version: `3.10` (o la mas reciente disponible)
   - Application root: `pmo_app/backend`
   - Application URL: `/` o `/api`
   - Application startup file: `passenger_wsgi.py` (lo crearemos)
   - Application Entry point: `application`
3. Clic en **Create**
4. **No cierres la pagina** — copia el comando que aparece para activar el virtualenv
   (algo como `source /home/tuusuario/virtualenv/pmo_app/backend/3.10/bin/activate`)

Ahora crea el archivo WSGI:

```bash
cd ~/pmo_app/backend
nano passenger_wsgi.py
```

Pega este contenido:

```python
import sys
import os

# Agregar el directorio del backend al path
sys.path.insert(0, os.path.dirname(__file__))

# Cargar variables de entorno
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

from app.main import app

# Passenger espera un callable llamado 'application'
application = app
```

Guarda y cierra.

### Opcion B: Proceso en Background (alternativa)

Si no tienes "Setup Python App" (comun en algunos planes Reseller viejos), puedes usar un cron job o screen:

```bash
cd ~/pmo_app
source venv/bin/activate

# Con screen (mantiene el proceso vivo)
screen -S pmo
cd backend
uvicorn app.main:app --host 127.0.0.1 --port 8080
# Presiona Ctrl+A, luego D para desconectar screen
# Para reconectar: screen -r pmo
```

Para asegurar que el proceso arranque automaticamente tras un reinicio, agrega un cron job en cPanel > **Cron Jobs**:

```
@reboot cd /home/tuusuario/pmo_app && source venv/bin/activate && cd backend && nohup uvicorn app.main:app --host 127.0.0.1 --port 8080 > ~/pmo_app/uvicorn.log 2>&1 &
```

### Opcion C: Solo tengo Reseller sin Python App ni SSH

Si tu plan Reseller no permite Python ni SSH (raro pero posible en planes muy basicos), tienes dos opciones:
1. **Contactar soporte** para habilitar Python en tu paquete WHM
2. **Upgrade a Business/VPS** — la plataforma PMO requiere Python backend persistente

---

## Paso 9: Compilar y Subir el Frontend

En tu **maquina local** (no en el servidor):

```bash
cd pmo_app/frontend

# Instalar dependencias
npm install

# Configurar la URL del API
echo "VITE_API_URL=https://tudominio.com/api" > .env.production

# Compilar para produccion
npm run build
```

Esto genera la carpeta `dist/`. Ahora subela al servidor:

### Subir via SCP:
```bash
scp -P 2222 -r dist/* tuusuario@tudominio.com:~/public_html/
```

### O via File Manager de cPanel:
1. Comprime la carpeta `dist` como ZIP
2. En cPanel > **File Manager**, navega a `public_html`
3. Sube el ZIP y extrae

---

## Paso 10: Configurar .htaccess para SPA

El frontend es una Single Page App (SPA). Necesitas que todas las rutas vayan a `index.html`.

En cPanel > **File Manager**, navega a `public_html` y edita (o crea) `.htaccess`:

```apache
RewriteEngine On

# Si el request es para un archivo o directorio real, servirlo directamente
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d

# Redirigir requests /api/* al backend Python
RewriteRule ^api/(.*)$ http://127.0.0.1:8080/api/$1 [P,L]

# Todo lo demas va a index.html (SPA routing)
RewriteRule ^ index.html [L]
```

---

## Paso 11: Configurar SSL (HTTPS)

1. En cPanel, busca **Security** > **SSL/TLS** o **Let's Encrypt**
2. Si ves **AutoSSL** o **Let's Encrypt**, activalo para tu dominio
3. Espera unos minutos a que se emita el certificado
4. Verifica en tu navegador: `https://tudominio.com` deberia funcionar

---

## Paso 12: Verificar que Todo Funcione

1. **Backend Health**: Visita `https://tudominio.com/api/health`
   - Deberia devolver: `{"status": "ok", "db_connected": true, ...}`

2. **Frontend**: Visita `https://tudominio.com`
   - Deberia mostrar la pagina de login

3. **Login**: Usa las credenciales del super admin:
   - Usuario: `admin`
   - Password: `Admin123!`

4. **Panel Super Admin**: Deberia redirigirte a `/superadmin` con los 2 tenants demo

---

## Troubleshooting

### "No veo SSH Access en cPanel" / "La opcion esta deshabilitada"

Sintoma: entras a cPanel, buscas "ssh" y no aparece nada, o aparece pero al
abrirlo dice "Shell access has been disabled for this account".

Causa: el shell no esta habilitado a nivel servidor, o el feature esta
deshabilitado en el Feature Manager.

Solucion:
1. Si tienes WHM: ve a *Account Functions > Manage Shell Access* y pon
   **Jailed Shell** para tu cuenta (ver Paso 2.1).
2. Si aun no aparece, en WHM ve a *Packages > Feature Manager*, selecciona la
   feature list del paquete y asegurate que **"SSH Access"** este marcado.
3. Si NO tienes WHM (plan compartido sin reseller): abre un ticket a soporte
   de HostGator con este texto:

   > Hola, necesito habilitar Jailed Shell (SSH) en mi cuenta cPanel
   > `tuusuario` para poder hacer deploy de una aplicacion Python. Por favor
   > confirmen el puerto SSH del servidor.

4. Mientras esperan respuesta, usa la **Ruta B** de esta guia — hace todo el
   deploy desde cPanel sin SSH.

### "Permission denied (publickey)" / SSH pide password

HostGator Reseller no permite login por password en SSH — solo llave publica
autorizada. Verifica:

- Que **autorizaste** la llave publica en cPanel (Paso 2.3 punto 5).
- Que usas el puerto correcto: `-p 2222`.
- Si usas llave generada en el servidor, que la privada local tenga permisos
  `600`: `chmod 600 ~/.ssh/hostgator_pmo`.
- Prueba con `-v` para ver detalles: `ssh -v -p 2222 tuusuario@tudominio.com`.

### Plan Reseller: No veo "Setup Python App" / "Application Manager" en cPanel

En WHM:
1. **Feature Manager** (*Packages > Feature Manager*)
2. Selecciona el feature list que usa tu cuenta
3. Asegurate que **"Setup Python App"** (o **"Application Manager"**) este
   marcado
4. Guarda cambios y recarga el cPanel de la cuenta

Si tu paquete no incluye Python, editalo en WHM > *Edit a Package*, o contacta
soporte de HostGator para que agreguen el modulo al servidor.

### "502 Bad Gateway" o "Application Error"

```bash
# Revisar logs
cd ~/pmo_app/backend
source ~/pmo_app/venv/bin/activate
python -c "from app.main import app; print('OK')"
```

Si da error, revisa las dependencias:
```bash
pip install -r requirements.txt
```

### "Access denied for user" (MySQL)

Verifica en cPanel > **MySQL Databases** que:
- El usuario esta asignado a la BD
- Tiene ALL PRIVILEGES
- El nombre en `.env` incluye el prefijo de cPanel (`tuusuario_`)

### "Table doesn't exist"

```bash
cd ~/pmo_app/backend
source ~/pmo_app/venv/bin/activate
python -m app.seed
```

### Frontend muestra pantalla en blanco

Revisa la consola del navegador (F12). Si ves errores de API:
- Verifica que `VITE_API_URL` en el build apunta a la URL correcta
- Verifica que `.htaccess` redirige `/api/*` al backend

### Reiniciar la aplicacion Python

En cPanel > **Setup Python App** > clic en el icono de **Restart** junto a tu app.

O por SSH:
```bash
touch ~/pmo_app/backend/tmp/restart.txt
```

---

## Ruta B: Deploy 100% desde cPanel UI

Usar esta ruta cuando **no aparece "Acceso SSH"** en cPanel y **no hay
Terminal**. Todo se hace desde la interfaz grafica de cPanel. Requiere:

- **Setup Python App** (seccion *Software*) — NO confundir con "Application
  Manager" a secas, que en HostGator compartido suele ser Node.js-only
- **Git Version Control** (seccion *Archivos*)
- **Cron Jobs** / **Trabajos programados** (seccion *Avanzado*)
- **File Manager** / **Administrador de archivos**
- **MySQL Databases** / **Bases de datos MySQL**

### B.0 — Pre-chequeo: confirmar que cPanel soporta Python

Antes de clonar nada, verifica que tu plan realmente soporte Python. Es
**crítico** porque en muchos planes HostGator shared el icono "Application
Manager" existe pero **solo corre Node.js**, sin opcion de elegir version de
Python al registrar la app.

1. En el buscador de cPanel escribe **`python`** (NO `application`).
2. Busca un icono con alguno de estos nombres:
   - **Setup Python App**
   - **Python Selector**
   - **Python Apps**
3. Abre el que aparezca. La pantalla de creacion debe mostrar un dropdown
   **Python version** con opciones (`3.8`, `3.9`, `3.10`, `3.11`, ...).
   - Si ves el dropdown → sigue con B.1, y en B.4 usa **Setup Python App** en
     vez de "Application Manager".
   - Si el icono **no existe** o al registrar la app **no te pide version de
     Python** (solo pide Node, o ningun runtime) → tu plan no tiene Python
     habilitado. **Detente aqui** y lee la nota de abajo.

> **Si no hay soporte Python en tu cPanel**, tienes tres opciones:
>
> 1. **Pedir a soporte HostGator que lo habiliten** (suele tomar 5-30 min,
>    a veces hasta 24 h, y puede ser rechazado segun el plan). Texto y
>    canales de contacto en [deploy-render.md](./deploy-render.md).
> 2. **Backend en Render + frontend en HostGator** (recomendado mientras
>    esperas el ticket, o permanente si HostGator no habilita Python).
>    Guia completa: [deploy-render.md](./deploy-render.md). El frontend
>    estatico queda en `public_html` y el `.htaccess` de B.7 se simplifica
>    (sin proxy `/api/*`).
> 3. **Upgrade del plan** a Business/VPS confirmando con soporte que incluya
>    Setup Python App antes de pagar.

### B.1 — Crear base de datos (igual que Paso 1)

Sigue el Paso 1 tal cual. Anota host, db, user, password.

### B.2 — Clonar el repo con Git Version Control

1. cPanel → buscador → `git` → abre **Git Version Control**
2. Clic en **Crear**
3. Campos:
   - **Clone URL**: `https://github.com/xguilxr/pmo_app.git`
     - Si el repo es privado:
       `https://USUARIO:TOKEN@github.com/xguilxr/pmo_app.git`
       (crea un PAT en GitHub con scope `repo`)
   - **Ruta del repositorio**: `/home/tuusuario/pmo_app`
   - **Nombre**: `pmo_app`
4. Clic en **Crear**. Espera al "Exito" (30-120s).

Para desplegar una rama especifica:

5. En la fila del repo clic en **Administrar**
6. Pestaña **Extraer** → selecciona la rama (ej. `claude/enable-ssh-deploy-CUwj1`)
7. Clic en **Actualizar** → **Extraer**

> **Actualizaciones futuras**: cada vez que hagas merge en GitHub, vuelve a
> *Git Version Control → Administrar → Extraer* → **Actualizar** para traer
> los cambios al servidor.

### B.3 — Crear `.env` desde File Manager

1. cPanel → **Administrador de archivos** (File Manager)
2. Navega a `/home/tuusuario/pmo_app`
3. Arriba, clic en **+ Archivo** → nombre: `.env` → **Crear nuevo archivo**
   - Si `.env.example` ya esta ahi, tambien puedes **copiarlo** (clic derecho
     → Copiar) y renombrar la copia a `.env`
4. Doble clic en `.env` → **Editar** → pega este contenido ajustando valores:

```env
APP_ENV=production
DEBUG=false

# Genera los dos secretos con un generador online (32+ caracteres hex cada uno)
SECRET_KEY=PEGA_AQUI_UN_STRING_DE_64_CARACTERES
JWT_SECRET=PEGA_AQUI_OTRO_STRING_DE_64_CARACTERES
JWT_EXPIRATION_HOURS=24

DATABASE_URL=mysql+pymysql://tuusuario_pmo_user:TU_PASSWORD@localhost:3306/tuusuario_pmo_db?charset=utf8mb4
DATABASE_POOL_SIZE=5

HOST=127.0.0.1
PORT=8080

DOMAIN=tudominio.com
CORS_ORIGINS=["https://tudominio.com","https://www.tudominio.com"]

AI_ENABLED=false
AI_DEFAULT_ENGINE=disabled
MPXJ_ENABLED=false

DEFAULT_LOCALE=es
SUPPORTED_LOCALES=es,en

MAX_UPLOAD_SIZE_MB=25
UPLOAD_DIR=/home/tuusuario/pmo_app/uploads
```

5. Guardar.

> Para generar los secretos sin terminal: usa <https://generate-secret.now.sh/64>
> o similar (NO reutilices secretos de desarrollo).

### B.4 — Registrar la app Python en cPanel

> Si en B.0 confirmaste que tienes **Setup Python App** / **Python Selector**,
> usalo. "Application Manager" genérico en HostGator shared suele ser
> Node.js-only y **no** funcionara para este backend. La señal inequivoca es
> que el formulario de registro te pida **Python version** en un dropdown.

1. cPanel → buscador → `python` → abre **Setup Python App** (o el icono
   equivalente confirmado en B.0)
2. Clic en **Create Application** / **Crear aplicacion**
3. Campos:
   - **Python version**: `3.10` o superior (la mas reciente disponible)
   - **Application name**: `pmo_api`
   - **Deployment domain**: tu dominio (o subdominio `api.tudominio.com`)
   - **Base URL path** / **Application URL**: `/api`
     (si usas subdominio dedicado, deja `/`)
   - **Application root** / **Application path**: `pmo_app/backend`
   - **Application startup file**: `passenger_wsgi.py`
   - **Application Entry point**: `application`
   - **Application environment**: `Production`
4. Clic en **Create** / **Deploy**
5. Al completar, busca la ruta del **virtualenv**, algo como
   `/home/tuusuario/virtualenv/pmo_app/backend/3.10/`. **Anota esa ruta exacta**,
   la necesitas en B.5.

   > **Si la ruta no aparece en la pantalla post-deploy**, tienes 3 formas de
   > obtenerla:
   >
   > - **Opcion 1 (recomendada)**: vuelve a Application Manager, haz clic en el
   >   nombre de la app (`pmo_api`) para abrir el detalle. Veras un campo
   >   **"Enter to the virtual environment"** con un comando como
   >   `source /home/tuusuario/virtualenv/pmo_app/backend/3.10/bin/activate && cd ...`.
   >   La ruta del venv es todo lo que va antes de `/bin/activate`.
   > - **Opcion 2 (por patron)**: cPanel siempre usa el mismo formato:
   >   `/home/TUUSUARIO/virtualenv/pmo_app/backend/3.X/` donde `3.X` es la
   >   version de Python que elegiste (p.ej. `3.10`, `3.11`, `3.12`). Sustituye
   >   `TUUSUARIO` por tu usuario de cPanel (lo ves arriba a la derecha, o en
   >   `/home/` por File Manager).
   > - **Opcion 3 (verificacion visual)**: cPanel → **Administrador de
   >   archivos** → navega a `/home/tuusuario/virtualenv/pmo_app/backend/` y
   >   veras una carpeta con el numero de version (p.ej. `3.10`); esa es la
   >   ruta completa del venv.

6. En la misma pantalla hay una seccion **Configuration files** — Application
   Manager detecta automaticamente `passenger_wsgi.py` (ya esta en el repo) y
   `requirements.txt`. Clic en **Run Pip Install** o similar para instalar las
   dependencias.

> Si no aparece boton para instalar requirements: la primera peticion HTTP a
> la app lanza el pip install automaticamente (puede tardar la primera vez).

### B.5 — Correr migraciones y seed con un Cron Job de un disparo

Sin Terminal, usamos Cron Jobs para ejecutar `python -m app.seed --demo` una
sola vez.

1. cPanel → buscador → `cron` → abre **Trabajos programados** (Cron Jobs)
2. Arriba, en **Correo electronico** pon tu mail — recibiras la salida del
   comando ahi, asi sabes si funciono.
3. En **Agregar un nuevo trabajo Cron**:
   - **Configuraciones comunes**: *Una vez por minuto* (lo dejamos cada
     minuto temporalmente y lo borramos despues)
   - **Comando**: (reemplaza la ruta del venv con la de B.4 paso 5)
     ```
     cd /home/tuusuario/pmo_app/backend && /home/tuusuario/virtualenv/pmo_app/backend/3.10/bin/python -m app.seed --demo >> /home/tuusuario/pmo_app/seed.log 2>&1
     ```
4. Clic en **Agregar nuevo trabajo Cron**.
5. Espera 1-2 minutos. Recibiras el correo con la salida. Deberias ver:
   ```
   Database seeded successfully!
     Mode: demo
     Super Admin: admin / Admin123!
   ```
6. **IMPORTANTE**: vuelve a Cron Jobs y **ELIMINA** este cron (no lo quieres
   corriendo cada minuto). Clic en **Eliminar** en la fila del cron.

> Si recibes error "Table already exists" en intentos siguientes, el seed ya
> corrio — borralo igual.
> Si recibes error de import: la primera peticion HTTP a la app no corrio aun
> el pip install. Abre `https://tudominio.com/api/health` en tu navegador para
> forzar el bootstrap, espera 1-2 min, y re-habilita el cron.

### B.6 — Frontend: compilar local y subir por File Manager

En tu **maquina local**:

```bash
cd frontend
npm install
echo "VITE_API_URL=https://tudominio.com/api" > .env.production
npm run build
# Comprime la carpeta dist/ en un ZIP
```

Sube el ZIP por cPanel:

1. cPanel → **Administrador de archivos** → navega a `/home/tuusuario/public_html`
2. **Cargar** / **Upload** → sube `dist.zip`
3. De vuelta en `public_html`, clic derecho sobre `dist.zip` → **Extract**
4. Los archivos quedan en `public_html/dist/`. Si quieres que el sitio se sirva
   directo desde `public_html`, muevelos un nivel arriba:
   - Entra a `public_html/dist/`
   - Selecciona todo (Ctrl+A) → **Mover** → destino `/public_html/`
5. Borra `dist.zip` y la carpeta `dist/` vacia.

### B.7 — `.htaccess` para SPA + proxy al backend

1. En `public_html`, clic en **Configuracion** arriba a la derecha → activa
   **Mostrar archivos ocultos (dotfiles)**
2. Si existe `.htaccess`, editalo; si no, crealo (**+ Archivo** → `.htaccess`)
3. Pega:

```apache
RewriteEngine On

# Requests a archivos/directorios reales se sirven directo
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d

# Todo lo que NO sea /api/* va a index.html (SPA routing)
RewriteCond %{REQUEST_URI} !^/api/
RewriteRule ^ index.html [L]
```

> Application Manager ya enruta `/api/*` al backend Python automaticamente
> (por eso en B.4 registraste la app con Base URL `/api`). No necesitas la
> regla `RewriteRule ^api/(.*)$ ... [P,L]` de la Ruta A.

### B.8 — SSL / HTTPS

cPanel → busca `ssl` → **Let's Encrypt SSL** o **SSL/TLS Status** → emite
certificado para tu dominio. Espera 2-5 min.

### B.9 — Verificar

1. `https://tudominio.com/api/health` → debe devolver JSON con `"status":"ok"`
2. `https://tudominio.com` → pantalla de login
3. Login con `admin` / `Admin123!`

### Mantenimiento en Ruta B

- **Actualizar codigo**: Git Version Control → Administrar → Extraer → **Actualizar**.
  Luego en Application Manager → clic en **Restart** en la app.
- **Cambiar variables**: editar `.env` en File Manager + **Restart** en
  Application Manager.
- **Logs**: Application Manager muestra stdout/stderr en la fila de la app
  (icono de log). Tambien `~/pmo_app/seed.log` para el cron.
- **Reiniciar sin Terminal**: Application Manager → boton **Restart** junto
  a la app.

---

## Configuracion del Motor de IA

El backend soporta tres motores de IA para generar minutas y reportes:

| Motor | `AI_DEFAULT_ENGINE` | Dónde corre | Costo | Apto para cPanel |
|---|---|---|---|---|
| Gemini 2.0 Flash | `gemini` | Google Cloud | Free tier ~1.500 req/dia, luego $0.10/$0.40 por 1M tok | Sí |
| Claude API | `claude_api` | Anthropic | ~$3/1M input, ~$15/1M output (Sonnet) | Sí |
| Ollama + Qwen | `ollama` | Tu máquina / VPS | Gratis pero requiere 8GB+ RAM | **No** (no corre en shared) |

### Opcion 1 — Gemini 2.0 Flash (recomendado para empezar, free tier)

1. Entra a <https://aistudio.google.com/apikey> con tu cuenta Google.
2. Clic en **Create API key** → selecciona un proyecto (o crea uno nuevo).
3. Copia la key (empieza con `AIzaSy...`).
4. En cPanel → **Administrador de archivos** → edita `$HOME/pmo_app/.env`:
   ```env
   AI_ENABLED=true
   AI_DEFAULT_ENGINE=gemini
   GEMINI_API_KEY=AIzaSy_tu_key_aqui
   GEMINI_MODEL=gemini-2.0-flash
   ```
5. Application Manager → **Restart** en la app `pmo_api`.
6. Prueba generando una minuta desde el frontend.

> **Free tier**: 15 req/min, 1.500 req/día, 1M tokens/día para `gemini-2.0-flash`.
> Al superarlo cobra a tarifa estándar. Monitorea uso en
> <https://aistudio.google.com/> → *Usage*.

### Opcion 2 — Claude API (premium / fallback)

1. Entra a <https://console.anthropic.com/> → **API Keys** → **Create Key**.
2. Añade saldo en **Billing** (mínimo $5).
3. Edita `$HOME/pmo_app/.env`:
   ```env
   AI_ENABLED=true
   AI_DEFAULT_ENGINE=claude_api
   ANTHROPIC_API_KEY=sk-ant-api03-...
   CLAUDE_MODEL=claude-haiku-4-5-20251001
   ```
   > Para mínimo costo usa `claude-haiku-4-5-20251001` (Haiku 4.5) en lugar
   > de Sonnet — ~5× más barato y suficiente para minutas/reportes.
4. Application Manager → **Restart**.

### Fallback automatico

Si configuras **ambas** keys (`GEMINI_API_KEY` + `ANTHROPIC_API_KEY`) y el
motor principal falla (p. ej. Gemini devuelve 429 por rate limit), el backend
cae automáticamente a Claude. Esto te protege ante cortes del free tier sin
intervención manual.

### Desactivar IA

Si no quieres exponer ninguna key ni usar IA:

```env
AI_ENABLED=false
```

Las funciones de generación devolverán error 503, pero el resto de la
plataforma funciona normal.

---

## Estructura de Archivos en el Servidor

```
/home/tuusuario/
  pmo_app/                    # Repositorio completo
    .env                      # Variables de entorno (NO commitear)
    venv/                     # Entorno virtual Python
    backend/
      app/                    # Codigo FastAPI
      migrations/             # Migraciones de BD
      passenger_wsgi.py       # Entry point para Passenger
    frontend/
      dist/                   # Build de produccion (se copia a public_html)
  public_html/                # Archivos publicos del sitio
    index.html                # Frontend compilado
    assets/                   # JS/CSS compilados
    .htaccess                 # Reglas de rewrite
```

---

## Credenciales de Demo

| Rol | Usuario | Password | Tenant |
|-----|---------|----------|--------|
| Super Admin | admin | Admin123! | Todos |
| Admin T1 | alfa_admin | Alfa123! | Grupo Alfa |
| PMO T1 | alfa_pmo | Alfa123! | Grupo Alfa |
| PM T1 | jgarcia | Pm1234! | Grupo Alfa |
| PM T1 | rlopez | Pm1234! | Grupo Alfa |
| Admin T2 | nova_admin | Nova123! | TechNova |
| PMO T2 | nova_pmo | Nova123! | TechNova |
| PM T2 | mrodriguez | Pm1234! | TechNova |
| PM T2 | dmorales | Pm1234! | TechNova |

> **IMPORTANTE**: Cambia todas las contrasenas en produccion.
