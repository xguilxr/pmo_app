# Guía de Setup - PMO Platform

## Requisitos previos

### Software necesario
| Software | Versión mínima | Para qué |
|----------|---------------|----------|
| **Node.js** | 18+ | Frontend React |
| **npm** | 9+ | Gestión de paquetes JS |
| **Python** | 3.11+ | Backend FastAPI |
| **PostgreSQL** | 15+ | Base de datos |
| **Ollama** | 0.1+ | Motor de IA local |
| **Java JRE** | 11+ | Lectura de archivos .mpp (MPXJ) |
| **Git** | 2.30+ | Control de versiones |

### Hardware recomendado (desarrollo)
| Componente | Mínimo | Recomendado |
|------------|--------|-------------|
| RAM | 8GB | 16GB+ |
| GPU VRAM | No requerida | 8GB+ (para IA más rápida) |
| Disco | 10GB libres | 20GB+ |
| CPU | 4 cores | 8 cores |

> Sin GPU, Ollama usa CPU. Funciona pero es más lento (~30s vs ~5s por síntesis).

---

## 1. Clonar el repositorio

```bash
git clone https://github.com/xguilxr/pmo_app.git
cd pmo_app
```

---

## 2. Setup del Frontend (React)

```bash
# Entrar al directorio frontend
cd frontend

# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev
```

El frontend estará en: **http://localhost:5173**

### Comandos útiles
```bash
npm run dev        # Servidor de desarrollo con HMR
npm run build      # Build de producción (genera /dist)
npm run preview    # Preview del build de producción
```

---

## 3. Setup del Backend (FastAPI) — pendiente de implementar

```bash
# Crear entorno virtual de Python
cd backend
python -m venv venv

# Activar entorno virtual
# Linux/Mac:
source venv/bin/activate
# Windows:
venv\Scripts\activate

# Instalar dependencias (cuando exista requirements.txt)
pip install -r requirements.txt

# Copiar variables de entorno
cp ../.env.example ../.env
# Editar .env con tus valores reales

# Iniciar servidor
uvicorn app.main:app --reload --port 8080
```

El backend estará en: **http://localhost:8080**
Docs automáticos (Swagger): **http://localhost:8080/docs**

---

## 4. Setup de Base de Datos (PostgreSQL)

### Opción A: PostgreSQL local
```bash
# Instalar PostgreSQL (Ubuntu/Debian)
sudo apt install postgresql postgresql-contrib

# Crear base de datos
sudo -u postgres psql
CREATE DATABASE pmo_db;
CREATE USER pmo_user WITH PASSWORD 'tu_password_seguro';
GRANT ALL PRIVILEGES ON DATABASE pmo_db TO pmo_user;
\q
```

### Opción B: Docker (recomendado para desarrollo)
```bash
docker run -d \
  --name pmo-postgres \
  -e POSTGRES_DB=pmo_db \
  -e POSTGRES_USER=pmo_user \
  -e POSTGRES_PASSWORD=tu_password_seguro \
  -p 5432:5432 \
  postgres:16
```

### Opción C: Railway (producción)
Railway provee PostgreSQL integrado. La variable `DATABASE_URL` se configura automáticamente.

### Configurar en .env
```
DATABASE_URL=postgresql://pmo_user:tu_password_seguro@localhost:5432/pmo_db
```

---

## 5. Setup de Ollama (IA Local)

### Instalar Ollama

```bash
# Linux
curl -fsSL https://ollama.com/install.sh | sh

# Mac
# Descargar desde https://ollama.com/download/mac

# Windows
# Descargar desde https://ollama.com/download/windows
```

### Descargar el modelo recomendado

```bash
# Modelo principal recomendado: Qwen 2.5 7B (~4.4GB)
ollama pull qwen2.5:7b

# Si tienes 16GB+ RAM o GPU con 8GB+ VRAM, usa el de 14B (mejor calidad):
ollama pull qwen2.5:14b

# Alternativa (segunda opción):
ollama pull llama3.1:8b
```

### Verificar que funciona

```bash
# Verificar que Ollama está corriendo
curl http://localhost:11434/api/tags

# Probar generación rápida
curl http://localhost:11434/api/generate -d '{
  "model": "qwen2.5:7b",
  "prompt": "Resume en 3 puntos: El proyecto tiene 5 riesgos abiertos, 2 críticos. El avance es 45% vs 60% planeado. El presupuesto va en $1.2M de $2M.",
  "stream": false
}'
```

### Verificar rendimiento
```bash
# Test de velocidad - debe responder en <30s en CPU, <10s con GPU
time curl http://localhost:11434/api/generate -d '{
  "model": "qwen2.5:7b",
  "prompt": "Genera una minuta de reunión de ejemplo para un proyecto de migración ERP en español.",
  "stream": false
}' -o /dev/null
```

### Configurar en .env
```
AI_ENABLED=true
AI_DEFAULT_ENGINE=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5:7b
OLLAMA_TIMEOUT_SECONDS=120
```

### Troubleshooting Ollama
| Problema | Solución |
|----------|----------|
| "connection refused" | `ollama serve` para iniciar el servidor |
| Modelo muy lento | Verificar RAM disponible (`free -h`), cerrar apps pesadas |
| Out of memory | Usar modelo más pequeño: `qwen2.5:3b` o `phi3:mini` |
| GPU no detectada | Instalar drivers NVIDIA + CUDA toolkit |

---

## 6. Setup de Java (para MS Project)

Solo necesario si vas a importar archivos .mpp nativos.

```bash
# Ubuntu/Debian
sudo apt install default-jre

# Mac
brew install openjdk

# Verificar
java -version
```

La librería MPXJ (Python) se instala con:
```bash
pip install mpxj
```

---

## 7. Variables de entorno (.env)

```bash
# Copiar template
cp .env.example .env

# Editar con tus valores
nano .env  # o tu editor preferido
```

### Variables críticas que DEBES cambiar:
```
SECRET_KEY=genera-un-string-random-de-32-caracteres
JWT_SECRET=genera-otro-string-random-diferente
DATABASE_URL=postgresql://tu_user:tu_password@localhost:5432/pmo_db
```

### Generar secrets seguros:
```bash
# Python one-liner para generar secrets
python -c "import secrets; print(secrets.token_hex(32))"
```

---

## 8. Flujo de desarrollo día a día

```bash
# 1. Iniciar Ollama (si no está corriendo como servicio)
ollama serve &

# 2. Iniciar PostgreSQL (si usas Docker)
docker start pmo-postgres

# 3. Iniciar Backend
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --port 8080

# 4. Iniciar Frontend (en otra terminal)
cd frontend
npm run dev
```

### Accesos rápidos
| Servicio | URL |
|----------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:8080 |
| API Docs (Swagger) | http://localhost:8080/docs |
| Ollama API | http://localhost:11434 |
| PostgreSQL | localhost:5432 |

---

## 9. Pasar de desarrollo a producción

### Lo que cambia entre entornos:

| Variable | Desarrollo | Producción |
|----------|-----------|------------|
| `APP_ENV` | development | production |
| `DEBUG` | true | false |
| `DATABASE_URL` | localhost | URL de Railway/Neon |
| `SECRET_KEY` | cualquier cosa | Secret fuerte |
| `OLLAMA_BASE_URL` | localhost:11434 | Servidor dedicado o Claude API |
| `AI_DEFAULT_ENGINE` | ollama | claude_api (opcional) |

### En Railway:
1. Conectar repo de GitHub
2. Railway detecta Python automáticamente
3. Configurar variables de entorno en el dashboard de Railway
4. Railway provee `DATABASE_URL` automáticamente para PostgreSQL

El `.env` **nunca se sube** al repositorio (está en `.gitignore`).
Las credenciales de producción se configuran directo en Railway.
