# Arquitectura de Producción — PMO App

> Documento de referencia para la migración desde el estado puente (PC + ngrok)
> hacia la arquitectura final (dominio propio + servidor dedicado de backend +
> HostGator como SPA/uploads/MySQL). Vive junto al roadmap (`docs/roadmap.md`).
> Cualquier cambio en la topología se refleja aquí antes de ejecutarlo.

---

## 1. Estado actual — puente

Operable para demo. No es producción.

```
                     ┌─────────────────────┐
                     │   Navegador cliente │
                     └──────────┬──────────┘
                                │ HTTPS (URL ngrok rota)
                                ▼
                     ┌─────────────────────┐
                     │   ngrok free tunnel │   ← se cae si la PC se apaga
                     └──────────┬──────────┘
                                │ HTTP tunel
                                ▼
    ┌───────────────────────────────────────────────────┐
    │   PC del desarrollador (Windows + NSSM service)   │
    │  ┌─────────────────────────────────────────────┐  │
    │  │  uvicorn :8080                              │  │
    │  │   ├─ FastAPI (138 endpoints)                │  │
    │  │   ├─ static_frontend/  (SPA React compilada)│  │
    │  │   └─ uploads/  (logos, minutas, evidencias) │  │
    │  └─────────────────────────────────────────────┘  │
    └───────────────────────┬───────────────────────────┘
                            │ TCP 3306 + TLS
                            ▼
              ┌─────────────────────────────┐
              │   HostGator (shared)        │
              │   MySQL: pmo_db             │
              └─────────────────────────────┘
```

**Dolores**:
- URL pública muere con la PC, sin TLS propio.
- Backend + SPA + uploads en el mismo disco local — backup manual.
- No hay CI/CD ni replicación.

---

## 2. Estado objetivo — producción

Decisión del dueño (2026-04-16):
- **BD**: MySQL ya pagado en HostGator → se queda ahí.
- **Dominio**: compra externa (Namecheap/Cloudflare Registrar). Apunta a
  HostGator para aprovechar su file system y centralizar uploads.
- **Backend Python**: servidor dedicado donde ya corre otra app Python (en
  confirmación con el admin del servidor).
- **Frontend SPA**: servido desde HostGator (mismo dominio) para evitar CORS
  innecesario y reutilizar su CDN básico.

```
                    ┌──────────────────────────────┐
                    │   Navegador cliente          │
                    └──────────┬───────────────────┘
                               │ HTTPS (dominio propio)
                               ▼
                    ┌──────────────────────────────┐
                    │   Cloudflare (DNS + WAF)     │   ← TLS, cache SPA, rate limit
                    └──────────┬───────────────────┘
                               │
                ┌──────────────┼──────────────────┐
                │                                 │
        tudominio.com                    api.tudominio.com
        (SPA + uploads)                  (FastAPI)
                │                                 │
                ▼                                 ▼
    ┌────────────────────────┐      ┌────────────────────────────┐
    │   HostGator (shared)   │      │  Servidor Python dedicado  │
    │  ┌──────────────────┐  │      │  ┌──────────────────────┐  │
    │  │ public_html/     │  │      │  │ uvicorn + gunicorn   │  │
    │  │   index.html     │  │      │  │ FastAPI (solo API)   │  │
    │  │   assets/*       │  │      │  │ Alembic migrations   │  │
    │  │ uploads/         │  │      │  │ Sentry + JSON logs   │  │
    │  │   logos/         │  │      │  └──────────┬───────────┘  │
    │  │   projects/      │◄─┼──────┼─────────────┘              │
    │  │   minutas/       │  │ SFTP │     (escribe archivos      │
    │  └──────────────────┘  │      │      vía SFTP/WebDAV)      │
    │  ┌──────────────────┐  │      └──────────────┬─────────────┘
    │  │ MySQL pmo_db     │◄─┼─────────────────────┘
    │  └──────────────────┘  │       TCP 3306 + TLS
    └────────────────────────┘
```

### 2.1 Cómo escribe uploads el backend remoto

Tres opciones, ordenadas por complejidad:

| Opción | Esfuerzo | Pros | Contras |
|--------|----------|------|---------|
| **A. SFTP** desde backend a `uploads/` en HostGator | 1 día | Centralizado, HostGator sirve estáticos | Latencia por archivo, reconectar si cae SSH |
| **B. Subdominio `files.tudominio.com`** sobre HostGator + backend genera URLs firmadas | 2 días | Separa bucket, mejor escalado | Más componentes |
| **C. S3-compatible externo** (Backblaze B2 ~$0.005/GB) | 3 días | Infinitamente escalable, backups por defecto | Cuesta más, sale de HostGator |

**Recomendación inicial**: Opción A. HostGator ya está pagado y el sistema de
archivos resuelve el requisito de centralización. Si el volumen crece, migrar
a C.

### 2.2 Por qué Cloudflare delante de todo

- TLS gratis (HostGator shared no siempre expone Let's Encrypt fácil).
- Cache agresivo para la SPA (assets con hash).
- WAF gratis bloquea bots y SQLi básico.
- `api.tudominio.com` pasa por Cloudflare pero con `Cache-Control: no-store`
  para no cachear respuestas JSON.

---

## 3. Roadmap de migración

Fases encadenadas. Cada una entrega valor independiente.

### Fase 0 — Demo estable (en curso)
Estado puente. Ver `docs/roadmap.md §Fase 0`. No se toca la arquitectura.

### Fase 1 — Seguridad & aislamiento (1 semana)
No cambia la topología. Cierra las 6 cross-tenant leaks + rota secretos.
Prerrequisito para exponer cualquier dominio.

### Fase 2 — Producción básica (2–3 semanas)
Migración efectiva PC → arquitectura objetivo.

1. **Compra dominio** (Namecheap o Cloudflare Registrar, ~$12/año).
2. **Cloudflare free**: zona DNS, TLS, proxy naranja activo.
3. **Confirma servidor Python dedicado** con el admin. Requisitos:
   - Python 3.11+, systemd o supervisord
   - Acceso saliente TCP 3306 → HostGator MySQL
   - Acceso saliente SFTP 22 → HostGator `uploads/`
   - Puerto entrante 8080 expuesto a Cloudflare
4. **Alembic baseline** (cierra H2 del roadmap) — imprescindible antes de correr
   migraciones en un segundo entorno.
5. **Deploy backend** en el servidor dedicado:
   - `gunicorn -k uvicorn.workers.UvicornWorker app.main:app -b 0.0.0.0:8080`
   - Variables: `DATABASE_URL`, `SECRET_KEY`, `JWT_SECRET`, `UPLOAD_SFTP_*`
6. **Build SPA** con `VITE_API_URL=https://api.tudominio.com/api` y subir a
   `public_html/` en HostGator vía SFTP o GitHub Action.
7. **Uploads**: conectar backend a HostGator por SFTP (opción A §2.1). Ruta
   base `/public_html/uploads/`.
8. **DNS records**:
   - `tudominio.com` A → IP HostGator (proxy Cloudflare on)
   - `api.tudominio.com` A → IP servidor Python (proxy Cloudflare on)
9. **Smoke QA** con checklist de `docs/qa-smoke-checklist.md` + nuevo
   `docs/go-live-checklist.md`.
10. **Apagar ngrok**. La URL pública ahora es estable.

### Fase 3 — Escalabilidad
- Sentry + Slack alerts.
- UptimeRobot free ping cada 5 min a `api.tudominio.com/health`.
- Paginación en listados grandes (L3 del roadmap).
- Si el tráfico lo pide: cambiar Opción A (SFTP) por Opción C (Backblaze B2).

### Fase 4 — Hardening
- Redis para tenant cache (multi-instancia) — solo si se agregan workers.
- JWT key rotation.
- Backups automáticos de `uploads/` (ya que HostGator no los garantiza).
- Replica de lectura MySQL si el dashboard crece.

---

## 4. Costos estimados (Fase 2 vivo)

| Ítem | Proveedor | Costo |
|------|-----------|-------|
| Dominio `.com` | Cloudflare Registrar | ~$10/año |
| DNS + TLS + WAF | Cloudflare free | $0 |
| MySQL | HostGator shared (ya pagado) | $0 incremental |
| Frontend + uploads | HostGator shared (ya pagado) | $0 incremental |
| Backend Python | Servidor dedicado existente | $0 incremental |
| Error tracking | Sentry free | $0 |
| Mail transaccional | SendGrid free (100/día) | $0 |
| **Total incremental** | | **~$12/año** |

Si el servidor dedicado del admin no se concreta: fallback Render Starter
($7/mes) o Fly.io ($3–10/mes). El resto del diagrama no cambia.

---

## 5. Riesgos y mitigaciones

| Riesgo | Mitigación |
|--------|------------|
| HostGator shared tumba conexiones MySQL largas | Pool con `pool_pre_ping=True` (ya activo en `app/db.py`) + reintento en el ORM |
| SFTP intermitente al subir archivo grande | Retry con backoff en el uploader + 413 controlado en FastAPI |
| Servidor Python dedicado no lo autoriza el admin | Plan B: Render Starter ($7/mes), misma imagen Docker |
| Cloudflare proxy rompe uploads >100MB (límite free) | Subir directo a SFTP desde el backend (no pasa por Cloudflare) |
| Diferencia horaria DB vs backend | Forzar UTC en ambos (`TZ=UTC` + `time_zone='+00:00'`) |

---

## 6. Criterios de "está en producción"

Chequeables antes de apagar ngrok:
- [ ] `https://tudominio.com` carga la SPA con TLS válido de Cloudflare
- [ ] `https://api.tudominio.com/health` responde 200 `{status:"ok"}`
- [ ] Login con usuario superadmin + switch de tenant funciona
- [ ] Subir un logo de organización persiste en `public_html/uploads/logos/` y
      se sirve desde `https://tudominio.com/uploads/logos/...`
- [ ] Alembic corrió `upgrade head` sin errores en el servidor nuevo
- [ ] QA smoke checklist verde
- [ ] Sentry recibió al menos un evento de prueba
- [ ] Backup manual de MySQL guardado fuera de HostGator
- [ ] ngrok detenido en la PC, NSSM service deshabilitado

Cuando los 9 están ✅, se marca Fase 2 `[DONE]` en `docs/roadmap.md`.
