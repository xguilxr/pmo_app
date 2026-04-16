# Flujo de deploy y gestion de cambios

Describe como fluye un cambio desde el codigo hasta produccion, y como se
manejan los cambios de esquema de base de datos.

Complemento de [`deploy-self-hosted.md`](./deploy-self-hosted.md) (arquitectura
vigente: uvicorn nativo en Windows + NSSM + Cloudflare Tunnel). Para rutas
historicas ver [`docs/archive/`](./archive/README.md).

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
| `prod` | Lo que corre **en vivo** (tu PC). Solo merges de `dev`. | Humano, explicitamente | **Inmediato tras `git pull` + `nssm restart`** |

**Regla de oro**: `prod` **nunca** recibe un push directo ni un PR desde una
rama feature. Siempre pasa primero por `dev`.

### Ciclo de vida de un cambio

1. Claude (o tu) crea rama `claude/<descripcion-NNNN>` desde `dev`.
2. Commits, push, PR → `dev`.
3. Revisas en el PR. Si OK, merge.
4. Validas en `dev` local (levanta el backend en tu PC apuntando a una BD
   de pruebas o a un schema separado en HostGator MySQL).
5. Cuando estas seguro, creas PR `dev` → `prod`, revisas el diff acumulado,
   merge.
6. En tu PC (PowerShell **como Administrador**):
   ```powershell
   cd C:\pmo\pmo_app
   git checkout prod
   git pull origin prod

   # Si cambio requirements.txt:
   .\venv\Scripts\Activate.ps1
   pip install -r backend\requirements.txt
   deactivate

   nssm restart pmo-backend
   ```
7. Si hubo cambios de frontend, recompila y re-sube `dist.zip` a HostGator
   (ver S.7 en `deploy-self-hosted.md`).
8. Si hubo cambios de schema, ver seccion "Cambios de BD" abajo.

### Configuracion inicial de `prod` (solo una vez)

Desde tu PC, cuando `prod` aun no existe en el remoto:

```powershell
git fetch origin
git checkout -b prod origin/dev
git push -u origin prod
git checkout prod
```

A partir de aqui el workflow es siempre `git pull origin prod` en la PC.

---

## Sincronizacion manual

Tu PC **no tiene webhook de GitHub**, asi que cada actualizacion requiere
un `git pull` explicito. Es intencional:

**Pros:**
- Nada se despliega sin que tu lo decidas.
- Rollback trivial: `git checkout <commit-anterior>` + `nssm restart`.
- No hay agentes ni runners que mantener.

**Contras:**
- Tienes que acordarte de hacer el pull tras cada merge a `prod`.
- Si cambio `requirements.txt` y no corres `pip install -r ...`, el backend
  arranca con dependencias viejas. **Regla**: cuando veas cambios en
  requirements, siempre `pip install` antes del `nssm restart`.

### Atajo: script de deploy

Crea `C:\pmo\deploy.ps1` (fuera del repo para que no se borre en checkouts):

```powershell
# Uso: .\deploy.ps1 [dev|prod]   (default: prod)
param([string]$Branch = "prod")

$ErrorActionPreference = "Stop"
Set-Location "C:\pmo\pmo_app"

git fetch origin
git checkout $Branch
git pull origin $Branch

# Reinstalar deps si cambiaron
.\venv\Scripts\Activate.ps1
pip install -r backend\requirements.txt -q
deactivate

# Reiniciar servicio (requiere PowerShell admin)
nssm restart pmo-backend

Write-Host "Deploy de '$Branch' completo. Logs:" -ForegroundColor Green
Start-Sleep -Seconds 3
Get-Content "C:\pmo\pmo_app\logs\backend.out.log" -Tail 20
```

Ejecuta **como Administrador**: `C:\pmo\deploy.ps1 prod`.

---

## Cambios de base de datos

El backend corre `_sync_schema_on_startup()` automaticamente al arrancar
(ver `backend/app/main.py`). Esto:

1. Ejecuta `Base.metadata.create_all()` — crea tablas faltantes. **Nunca**
   altera columnas de tablas existentes.
2. Lee `backend/migrations/sync_schema.sql` (si existe) y aplica cada
   sentencia `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` en su propia
   transaccion.

### Cuando agregas una columna nueva

1. Edita el modelo en `backend/app/models/*.py`.
2. Agrega una linea a `backend/migrations/sync_schema.sql`:
   ```sql
   ALTER TABLE mi_tabla ADD COLUMN IF NOT EXISTS mi_col VARCHAR(255) NULL;
   ```
3. Commit + PR normal.
4. Al mergear y hacer `git pull + nssm restart`, el backend corre
   `_sync_schema_on_startup()` automaticamente. No hace falta Alembic.

### Cuando haces un cambio destructivo (drop column, rename, type change)

`sync_schema.sql` **NO** cubre destructivo. Opciones:

1. **Preferido**: Alembic. Crea la migracion localmente apuntando a una BD
   de pruebas:
   ```powershell
   cd C:\pmo\pmo_app\backend
   .\..\venv\Scripts\Activate.ps1
   $env:DATABASE_URL = "mysql+pymysql://tuusuario_pmo_user:TU_PASSWORD@tudominio.com:3306/tuusuario_pmo_db_test?charset=utf8mb4"
   alembic revision --autogenerate -m "describe_change"
   ```
   Revisa el archivo generado en `backend/migrations/versions/`, commit y
   merge. En deploy:
   ```powershell
   cd C:\pmo\pmo_app\backend
   .\..\venv\Scripts\Activate.ps1
   alembic upgrade head
   deactivate
   nssm restart pmo-backend
   ```

2. **Atajo**: SQL manual via DBeaver o phpMyAdmin (cPanel lo incluye). Solo
   para cambios pequeños y controlados.

### Reseed

Si necesitas resetear datos de demo tras cambios grandes:

```powershell
cd C:\pmo\pmo_app\backend
.\..\venv\Scripts\Activate.ps1
python -m app.seed --demo
deactivate
```

`--demo` es idempotente (`ON DUPLICATE KEY UPDATE` en inserts).

---

## Checklist por deploy

Antes de mergear `dev` → `prod`:

- [ ] Pruebas manuales locales OK (levantar uvicorn en tu PC contra `dev`).
- [ ] Si hay cambios de BD, `sync_schema.sql` actualizado o migracion
      Alembic lista.
- [ ] Si hay cambios en `requirements.txt`, probaste un `pip install` local.
- [ ] Si hay cambios en `.env.example`, actualiza tu `.env` en la PC ANTES
      del deploy.
- [ ] Si hay cambios de frontend, tienes un plan para recompilar y resubir
      a HostGator.

Despues del deploy:

- [ ] `curl https://api.tudominio.com/api/health` responde 200.
- [ ] Login en `https://tudominio.com` funciona.
- [ ] Al menos 2 rutas criticas probadas (dashboard + un detalle).
- [ ] `Get-Content C:\pmo\pmo_app\logs\backend.err.log -Tail 50` no muestra
      errores nuevos.

---

## Rollback rapido

```powershell
cd C:\pmo\pmo_app
git log --oneline -5          # ver ultimos commits
git checkout <sha-anterior>   # volver a version previa
nssm restart pmo-backend
```

Si el rollback incluye schema y ya corriste un `create_all()` que creo
tablas nuevas: el rollback no las borra (no hay mal), pueden quedar
ignoradas por la version vieja. Si molesta, dropealas via DBeaver.

Volver a `prod` normal despues:
```powershell
git checkout prod
git pull
nssm restart pmo-backend
```
