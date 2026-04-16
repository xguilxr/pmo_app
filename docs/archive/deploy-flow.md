# Flujo de Deploy y Gestion de Cambios

Este documento describe como fluye un cambio desde el codigo hasta el servidor
productivo en HostGator, y como se manejan los cambios que impactan la base de
datos.

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
| `dev` | Integracion. Todos los PRs entran aqui. Aqui se prueba. | Merge de PRs | Ninguno (no es desplegada) |
| `prod` | Lo que corre **en vivo** en HostGator. Solo merges de `dev`. | Humano, explicitamente | **Inmediato tras "Update" en cPanel** |

**Regla de oro**: `prod` **nunca** recibe un push directo ni un PR desde una
rama feature. Siempre pasa primero por `dev`.

### Ciclo de vida de un cambio

1. Claude (o tu) crea rama `claude/<descripcion-NNNN>` desde `dev`.
2. Commits, push, PR → `dev`.
3. Revisas en el PR. Si OK, merge.
4. Validas en el entorno de `dev` (local o staging si lo montamos despues).
5. Cuando estas seguro, creas PR `dev` → `prod`, revisas el diff acumulado,
   merge.
6. En cPanel > **Git Version Control** > repo `pmo_app` > pestana **Extraer**
   → rama `prod` → **Actualizar**.
7. cPanel > **Application Manager** > clic en **Restart** sobre la app.
8. Si hubo cambios de BD, correr el Cron Job de migracion (ver abajo).

### Configuracion inicial de `prod` (solo una vez)

En tu maquina local, cuando `prod` aun no existe en el remoto:

```bash
git fetch origin
git checkout -b prod origin/dev
git push -u origin prod
```

En cPanel Git Version Control, cambia la rama checkeada a `prod`.

---

## Sincronizacion automatica vs manual en cPanel

**cPanel NO sincroniza automaticamente** con GitHub. Cada cambio en `prod` en
GitHub requiere un clic en **Actualizar** dentro de Git Version Control.

Pros:
- Nada se despliega sin intencion explicita.
- Puedes ver el diff antes de actualizar.
- Pausa natural para ejecutar migraciones antes del restart.

Contras:
- Requiere un humano haga el clic.

Si en algun momento quieres automatizarlo, se puede con un **GitHub Action**
que llame un webhook en el servidor que corra `git pull` + restart. Por ahora
el clic manual es la opcion mas segura.

---

## Cambios que impactan la base de datos

El proyecto usa **Alembic** (`backend/migrations/`) para migraciones.

### Regla general

- **Cambio solo de codigo** (API, UI, logica): flujo normal. `git pull` en
  cPanel, restart en Application Manager. Listo.
- **Cambio de schema** (nueva tabla, columna, indice, FK, etc.): requiere
  **correr una migracion** antes de restart para que el codigo nuevo no
  explote contra la BD vieja.

### Como identifico si hay cambios de BD en un PR

En el PR mira si toca:
- `backend/app/models/*.py` (nuevos campos, clases, relaciones)
- `backend/migrations/versions/*.py` (migracion explicita agregada)
- `backend/migrations/sync_schema.sql` (schema master)

Si si → hay cambio de BD. Si no → normalmente no.

### Crear una migracion (desde desarrollo)

```bash
cd backend
source venv/bin/activate
alembic revision --autogenerate -m "descripcion breve"
# Revisa el archivo generado en backend/migrations/versions/
# y ajusta si es necesario (autogenerate no detecta todo)
```

Commitea el archivo de migracion junto con el cambio de modelo.

### Aplicar una migracion en HostGator (sin SSH)

Igual que el seed: con un Cron Job de un disparo.

1. cPanel → **Trabajos programados** (Cron Jobs)
2. Agrega un cron "una vez por minuto" con el comando:

   ```
   cd /home/tuusuario/pmo_app/backend && \
     /home/tuusuario/virtualenv/pmo_app/backend/3.10/bin/python -m alembic upgrade head \
     >> /home/tuusuario/pmo_app/migrate.log 2>&1
   ```

3. Espera 1-2 min. Revisa el log en File Manager o recibelo por email (pon tu
   correo en la parte superior de Cron Jobs).
4. **Elimina** el cron despues del primer disparo exitoso.
5. Restart en Application Manager.

### Rollback de una migracion

```
cd /home/tuusuario/pmo_app/backend && \
  /home/tuusuario/virtualenv/pmo_app/backend/3.10/bin/python -m alembic downgrade -1
```

Ejecutalo con el mismo patron de Cron Job de un disparo.

---

## Checklist de deploy de `prod`

Antes de hacer clic en **Actualizar** en cPanel Git Version Control:

- [ ] Los tests pasaron en el CI del PR `dev → prod`.
- [ ] Identifique si hay cambios de BD (ver arriba).
- [ ] Tengo el comando de migracion listo para pegarlo en Cron Jobs si aplica.
- [ ] Tengo el Application Manager abierto en otra pestana para el Restart.
- [ ] Tengo un plan de rollback: si algo falla, Git Version Control permite
      regresar a un commit previo con **Extraer** y volver a Actualizar.

Flujo real:

1. cPanel → Git Version Control → **Actualizar** rama `prod`.
2. (Si hay cambio de BD) Cron Job de migracion → espera salida → elimina cron.
3. Application Manager → **Restart** de `pmo_api`.
4. Verifica en navegador: `https://tudominio.com/api/health` → JSON ok.
5. Smoke test de la feature que cambio.

---

## Cuando NO usar `prod` y cambiar en vivo

**Nunca editar archivos directamente en el servidor**. Aunque parezca rapido,
el siguiente `git pull` sobreescribe los cambios o entra en conflicto y
rompe el deploy.

Si necesitas un hotfix urgente:
1. Crea una rama `hotfix/<descripcion>` desde `prod`.
2. Haz el cambio y PR → `prod` directamente (unico caso donde se salta `dev`).
3. Luego merge `prod` → `dev` para sincronizar.

---

## Resumen visual

```
Cambio de codigo normal:
  commit → PR a dev → merge → PR a prod → merge →
  cPanel Actualizar prod → Application Manager Restart → listo

Cambio con BD:
  commit (incl. migration) → PR a dev → merge → PR a prod → merge →
  cPanel Actualizar prod → Cron Job migracion → borrar cron →
  Application Manager Restart → verificar → listo

Hotfix urgente:
  branch hotfix/ desde prod → fix → PR prod → merge →
  Actualizar → Restart → merge prod→dev para sync
```
