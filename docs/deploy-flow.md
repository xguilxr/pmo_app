# Flujo de deploy y gestion de cambios

Describe como fluye un cambio desde el codigo hasta produccion, y como se
manejan los cambios de esquema de base de datos.

Complemento de [`deploy-self-hosted.md`](./deploy-self-hosted.md) (arquitectura
vigente). Para rutas historicas ver [`docs/archive/`](./archive/README.md).

---

## Estrategia de ramas

```
┌───────────────────────┐      ┌──────────┐      ┌──────────┐
│  claude/<feature-XYZ> │  →   │   dev    │  →   │   prod   │
└───────────────────────┘      └──────────┘      └──────────┘
        trabajo diario           pre-produccion    en vivo
```

| Rama | Proposito | Quien mergea | Impacto |
|------|-----------|--------------|---------|
| `claude/<feature>` | Desarrollo individual, un PR por feature | Claude o humano | Ninguno |
| `dev` | Integracion. Todos los PRs entran aqui. Aqui se prueba. | Merge de PRs | Ninguno (puede correr en tu PC para pruebas) |
| `prod` | Lo que corre **en vivo** (tu PC). Solo merges de `dev`. | Humano, explicitamente | **Inmediato tras `git pull` + restart** |

**Regla de oro**: `prod` **nunca** recibe un push directo ni un PR desde una
rama feature. Siempre pasa primero por `dev`.

### Ciclo de vida de un cambio

1. Claude (o tu) crea rama `claude/<descripcion-NNNN>` desde `dev`.
2. Commits, push, PR → `dev`.
3. Revisas en el PR. Si OK, merge.
4. Validas en `dev` local (levantas el backend en tu PC apuntando a una BD
   de pruebas o a un schema separado en HostGator MySQL).
5. Cuando estas seguro, creas PR `dev` → `prod`, revisas el diff acumulado,
   merge.
6. En tu PC (PowerShell):
   ```powershell
   cd C:\Users\<tu-usuario>\Projects\pmo_app
   git checkout prod
   git pull origin prod
   docker compose -f docker\docker-compose.selfhosted.yml up -d --build
   ```
7. Si el cambio incluye frontend, recompila y re-sube `dist.zip` a HostGator
   (ver S.6 en `deploy-self-hosted.md`).
8. Si hubo cambios de schema de BD, ver seccion "Cambios de BD" abajo.

### Configuracion inicial de `prod` (solo una vez)

Desde tu PC, cuando `prod` aun no existe en el remoto:

```powershell
git fetch origin
git checkout -b prod origin/dev
git push -u origin prod
```

En tu PC de deploy deja la rama `prod` checkeada:

```powershell
git checkout prod
```

A partir de aqui el workflow es siempre `git pull origin prod` en la PC.

---

## Sincronizacion manual

Tu PC **no tiene webhook de GitHub**, asi que cada actualizacion requiere
un `git pull` explicito. Esto es intencional:

**Pros:**
- Nada se despliega sin que tu lo decidas.
- Rollback trivial: `git checkout <commit-anterior>` + restart.
- No hay agentes ni runners que mantener.

**Contras:**
- Tienes que acordarte de hacer el pull tras cada merge a `prod`.
- Si olvidas el `--build` de Docker Compose con cambios en `requirements.txt`,
  el contenedor corre con dependencias viejas. **Regla**: siempre usa
  `up -d --build` despues de un pull.

### Atajo: script de deploy

Crea `scripts/deploy.ps1` en tu PC (fuera del repo si quieres) con:

```powershell
# Uso: .\deploy.ps1 [dev|prod]   (default: prod)
param([string]$Branch = "prod")

$ErrorActionPreference = "Stop"
Set-Location "C:\Users\<tu-usuario>\Projects\pmo_app"

git fetch origin
git checkout $Branch
git pull origin $Branch

docker compose -f docker\docker-compose.selfhosted.yml up -d --build

Write-Host "Deploy de '$Branch' completo. Logs:" -ForegroundColor Green
docker compose -f docker\docker-compose.selfhosted.yml logs --tail=30 backend
```

Ejecuta: `.\deploy.ps1 prod`.

---

## Cambios de base de datos

El backend corre `_sync_schema_on_startup()` automaticamente al arrancar
(ver `backend/app/main.py`). Esto:

1. Ejecuta `Base.metadata.create_all()` — crea tablas faltantes. **Nunca**
   altera columnas de tablas existentes.
2. Lee `backend/migrations/sync_schema.sql` (si existe) y aplica cada
   sentencia `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` en su propia
   transaccion, ignorando errores "columna ya existe".

### Cuando agregas una columna nueva

1. Edita el modelo en `backend/app/models/*.py`.
2. Agrega una linea a `backend/migrations/sync_schema.sql`:
   ```sql
   ALTER TABLE mi_tabla ADD COLUMN IF NOT EXISTS mi_col VARCHAR(255) NULL;
   ```
3. Commit + PR normal.
4. Al mergear y hacer `git pull + up -d --build`, el backend lanza el
   `_sync_schema_on_startup()` automaticamente. No necesitas correr
   Alembic a mano.

### Cuando haces un cambio destructivo (drop column, rename, type change)

`sync_schema.sql` **NO** cubre destructivo. Opciones:

1. **Preferido**: Alembic. Crea la migracion localmente apuntando a una BD
   de pruebas:
   ```powershell
   cd backend
   $env:DATABASE_URL = "mysql+pymysql://tuusuario_pmo_user:TU_PASSWORD@tudominio.com:3306/tuusuario_pmo_db_test?charset=utf8mb4"
   alembic revision --autogenerate -m "describe_change"
   ```
   Revisa el archivo generado en `backend/migrations/versions/`, commit,
   merge, y en deploy corre:
   ```powershell
   docker compose -f docker\docker-compose.selfhosted.yml exec backend alembic upgrade head
   ```

2. **Atajo**: SQL manual via DBeaver o phpMyAdmin (cPanel lo incluye). Solo
   para cambios pequeños y controlados, y solo si no tienes multiples
   entornos que sincronizar.

### Reseed

Si necesitas resetear datos de demo tras cambios grandes:

```powershell
docker compose -f docker\docker-compose.selfhosted.yml exec backend python -m app.seed --demo
```

`--demo` es idempotente: `ON DUPLICATE KEY UPDATE` en los inserts, asi que
no rompe datos reales pero si actualiza los de demo.

---

## Checklist por deploy

Antes de mergear `dev` → `prod`:

- [ ] CI (si hay) en verde, o pruebas manuales locales OK.
- [ ] Si hay cambios de BD, `sync_schema.sql` actualizado o migracion
      Alembic lista.
- [ ] Si hay cambios en `requirements.txt`, probaste un `--build` local.
- [ ] Si hay cambios en `.env.example`, actualiza tu `.env` en la PC ANTES
      de hacer el deploy (variables nuevas con valores por default no
      crashean, pero obligatorias si.)
- [ ] Si hay cambios de frontend, tienes un plan para recompilar y resubir
      a HostGator.

Despues del deploy:

- [ ] `curl https://api.tudominio.com/api/health` responde 200.
- [ ] Login en `https://tudominio.com` funciona.
- [ ] Al menos 2 rutas criticas probadas (dashboard + un detalle de
      proyecto).
- [ ] Logs de `docker compose logs backend` no muestran errores nuevos.

---

## Rollback rapido

```powershell
cd C:\Users\<tu-usuario>\Projects\pmo_app
git log --oneline -5          # ver los ultimos commits
git checkout <sha-anterior>    # volver a version previa
docker compose -f docker\docker-compose.selfhosted.yml up -d --build
```

Si el rollback incluye schema, y ya habias corrido un `create_all()` que
creo tablas nuevas: el rollback no las borra (no hay mal), y pueden quedar
ignoradas por la version vieja. Si molesta, dropealas manualmente via
DBeaver.

Cuando arregles el problema y quieras volver a `prod` normal:

```powershell
git checkout prod
git pull
docker compose -f docker\docker-compose.selfhosted.yml up -d --build
```
