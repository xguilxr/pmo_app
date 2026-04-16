# Despliegue en HostGator cPanel - PMOAAS

Guia paso a paso para desplegar la plataforma PMO en un hosting HostGator con cPanel.

---

## Requisitos Previos

- Plan de HostGator con acceso a **cPanel** (Business o superior recomendado)
- Acceso SSH habilitado (se activa desde cPanel)
- Dominio configurado apuntando a HostGator
- Python 3.10+ disponible (HostGator lo tiene por defecto)

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

Si no tienes "Setup Python App", puedes usar un cron job o screen:

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

Causa: el shell no esta habilitado a nivel servidor.

Solucion:
1. Si tienes WHM: ve a *Account Functions > Manage Shell Access* y pon
   **Jailed Shell** para tu cuenta (ver Paso 2.1).
2. Si NO tienes WHM (plan compartido sin reseller): abre un ticket a soporte
   de HostGator con este texto:

   > Hola, necesito habilitar Jailed Shell (SSH) en mi cuenta cPanel
   > `tuusuario` para poder hacer deploy de una aplicacion Python. Por favor
   > confirmen el puerto SSH del servidor.

3. Mientras esperan respuesta, puedes adelantar los pasos 1, 9 y 10 que se
   hacen desde **File Manager** sin SSH.

### "Permission denied (publickey)" al conectar por SSH

- Verifica que **autorizaste** la llave publica en cPanel (Paso 2.3 punto 5)
- Verifica que usas el puerto correcto: `-p 2222`
- Si usas llave generada en el servidor, asegurate que la privada local
  tiene permisos `600`: `chmod 600 ~/.ssh/hostgator_pmo`
- Prueba con `-v` para ver detalles: `ssh -v -p 2222 tuusuario@tudominio.com`

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
