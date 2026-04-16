# Archivo de documentos legacy

Estos documentos y archivos describen rutas de despliegue que la plataforma
**ya no usa** como default, pero se conservan como referencia por si el equipo
quiere retomarlas en el futuro.

## Que hay aqui

| Archivo | Que cubre | Por que se archivo |
|---|---|---|
| [`deploy-hostgator.md`](./deploy-hostgator.md) | Deploy 100% HostGator (Rutas A con SSH y B con cPanel UI) usando Setup Python App / Passenger | HostGator shared no ofrece Setup Python App en muchos planes; el Application Manager disponible es Node.js-only, asi que esta ruta no es viable sin upgrade de plan o ticket a soporte. |
| [`deploy-render.md`](./deploy-render.md) | Hibrido: backend en Render free tier + frontend en HostGator | Render free tier tiene cold starts de 30-60 s, sin IP saliente estatica, sin disco persistente. Aceptable para demo pero fragil para uso diario. |
| [`deploy-flow.md`](./deploy-flow.md) | Flujo `dev` → `prod` con Git Version Control + Application Manager restart + Cron Jobs de migracion en cPanel | Dependia del stack cPanel Passenger; ver [`deploy-flow.md` actual](../deploy-flow.md) para el flujo vigente (self-hosted en PC). |
| [`passenger_wsgi.py`](./passenger_wsgi.py) | Entry point Passenger con shim `a2wsgi` para exponer FastAPI ASGI como WSGI | Solo se usa si re-activas la ruta HostGator Passenger. Si vuelves a esa ruta: copialo de vuelta a `backend/passenger_wsgi.py` y agrega `a2wsgi>=1.10.0` a `backend/requirements.txt`. |

## Ruta vigente

Ver [`docs/deploy-self-hosted.md`](../deploy-self-hosted.md): backend FastAPI
corriendo en la PC del dueño 24/7, expuesto via Cloudflare Tunnel, con
MySQL + frontend estatico en HostGator.

## Como revivir una ruta archivada

1. **HostGator Passenger**: si soporte habilita Setup Python App / Python
   Selector en tu cPanel, mueve `passenger_wsgi.py` de vuelta a `backend/`,
   re-agrega `a2wsgi>=1.10.0` a `requirements.txt`, y sigue
   `deploy-hostgator.md` desde B.0.
2. **Render**: restaura `render.yaml` (esta en el historial de git en el
   commit que lo elimino) y sigue `deploy-render.md`.

En ambos casos, los cambios de arquitectura del lado de `backend/app/` no
deberian requerir modificaciones — la app es portable entre hostings.
