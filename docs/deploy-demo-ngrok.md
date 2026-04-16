# Deploy demo (ngrok): un solo URL publico para mostrar la app

Guia rapida para exponer la app **temporalmente** sin comprar dominio.
Sirve frontend + backend desde el mismo uvicorn local y los publica con
ngrok para que tu socio (o quien sea) la pruebe.

> Esta es la ruta de **demo / pre-produccion**. Para deploy permanente con
> dominio propio, ver [`deploy-self-hosted.md`](./deploy-self-hosted.md).

---

## Arquitectura

```
   Navegador (socio) ──HTTPS──▶ https://xxx.ngrok-free.app
                                          │
                                          ▼
                              tu PC Windows (puerto 8080)
                              ┌─────────────────────────┐
                              │  uvicorn (FastAPI)      │
                              │   ├─ /api/*  (backend)  │
                              │   └─ /*      (SPA build)│
                              └───────────┬─────────────┘
                                          │ MySQL
                                          ▼
                              HostGator (base de datos)
```

Una sola URL = sin CORS, sin mixed content. El frontend llama a `/api/*`
del mismo origen y ngrok reenvia al backend local.

---

## Requisitos previos

- Backend corriendo como servicio NSSM en `localhost:8080` (ver
  [Paso S.5 de la guia self-hosted](./deploy-self-hosted.md#paso-s5--correr-uvicorn-como-servicio-de-windows-con-nssm)).
- `python -m app.seed --demo` ejecutado al menos una vez.
- Node.js + npm instalados para construir el frontend.

Verifica con:

```powershell
nssm status pmo-backend                        # SERVICE_RUNNING
Invoke-RestMethod http://127.0.0.1:8080/api/health   # status: ok
```

---

## Paso N.1 — Construir frontend y servirlo desde uvicorn

El backend ya tiene el codigo para servir un SPA en `backend/static_frontend/`
(ver `backend/app/main.py` linea ~190). Solo necesitas dejar el build ahi.

### Crear `.env.production` con same-origin

```powershell
cd C:\Users\dagui\claude\pmo_app\frontend
"VITE_API_URL=/api" | Out-File -Encoding ascii -NoNewline .env.production
Get-Content .env.production   # debe decir exactamente: VITE_API_URL=/api
```

### Compilar (saltando type-check estricto si hay errores TS)

```powershell
npx vite build                # genera frontend/dist/
```

> Si ya arreglaste los errores TS del repo, puedes usar `npm run build`.

### Copiar al backend

```powershell
cd ..
Remove-Item -Recurse -Force backend\static_frontend -ErrorAction SilentlyContinue
Copy-Item -Recurse frontend\dist backend\static_frontend
nssm restart pmo-backend
Start-Sleep 3
(Invoke-WebRequest http://127.0.0.1:8080/).StatusCode   # 200
```

Abre `http://127.0.0.1:8080/` en el navegador para confirmar que ves la
SPA local antes de exponer.

---

## Paso N.2 — Instalar y configurar ngrok

### Instalar

```powershell
winget install --id Ngrok.Ngrok
# Cierra y abre PowerShell para refrescar PATH
ngrok version    # debe ser 3.20.0 o mayor
```

Si la version es anterior:

```powershell
ngrok update
```

### Crear cuenta y configurar token

1. Crea cuenta gratis en <https://dashboard.ngrok.com/signup>
2. Copia tu authtoken de <https://dashboard.ngrok.com/get-started/your-authtoken>
3. Configura (una sola vez):

```powershell
ngrok config add-authtoken TU_TOKEN_AQUI
```

---

## Paso N.3 — Levantar el tunnel

```powershell
ngrok http 8080
```

Ngrok imprime algo como:

```
Forwarding   https://abc123-def456.ngrok-free.app -> http://localhost:8080
```

Esa URL es la que mandas a tu socio. **Mantienes la ventana abierta**
mientras dure el demo. Si la cierras, el tunnel muere.

Tambien puedes ver requests en vivo en <http://127.0.0.1:4040>.

---

## Paso N.4 — Compartir con tu socio

Manda al socio simplemente:

```
https://abc123-def456.ngrok-free.app
```

Al abrir verá la SPA y podrá hacer login con cualquier usuario del seed
(ej. `alfa_admin / Alfa123!`).

> **Caché del navegador:** si tu propia sesion ya tenia un build viejo
> cargado, el navegador puede mantener el bundle viejo. Ctrl+Shift+Delete
> -> "Imagenes y archivos en cache" o pruebalo en incognito. Tu socio en
> su PC no tendra ese problema.

---

## Limitaciones y precauciones

- **URL cambia cada reinicio de `ngrok http 8080`** (en plan gratis).
  Para URL fija necesitas plan pago o dominio propio.
- **Tu PC tiene que estar prendida y conectada** todo el tiempo del demo.
  Evita que duerma:
  ```powershell
  powercfg /change standby-timeout-ac 0
  powercfg /change monitor-timeout-ac 0
  ```
- **Sin SLA**: ngrok-free puede tener cortes. Para demos importantes
  agenda con margen.
- **Limite de 60 requests/min** en plan gratis. Suficiente para un demo
  con 1-2 personas.
- **Sin cloudflared mientras tanto**: para que no consuma RAM ni se
  confunda, deja deshabilitado el servicio:
  ```powershell
  Stop-Service cloudflared -ErrorAction SilentlyContinue
  Set-Service cloudflared -StartupType Disabled -ErrorAction SilentlyContinue
  ```

---

## Re-deployar despues de cambios al codigo

Cada vez que cambies el frontend:

```powershell
cd C:\Users\dagui\claude\pmo_app\frontend
npx vite build
cd ..
Remove-Item -Recurse -Force backend\static_frontend
Copy-Item -Recurse frontend\dist backend\static_frontend
nssm restart pmo-backend
```

(El tunnel no necesita reinicio. Tu socio solo tiene que recargar la pagina.)

Cada vez que cambies el backend:

```powershell
nssm restart pmo-backend
```

---

## Troubleshooting

### Login da "Failed to fetch" / CORS error

Tu build viejo apunta a `http://localhost:8080`. Verifica que
`frontend/.env.production` diga `VITE_API_URL=/api`, vuelve a construir y
copiar (Paso N.1). Limpia caché del navegador o prueba en incognito.

### `404 Not Found` con `Server: cloudflare` en cualquier URL ngrok

No deberia pasar con ngrok (eso era de cloudflared). Si ves esto, estas
revisando un quick tunnel viejo de Cloudflare — usa la URL de ngrok.

### El servicio NSSM dice RUNNING pero `Invoke-RestMethod` falla

Espera 3-5 segundos despues de `nssm restart`. uvicorn tarda en arrancar.

### `ngrok http 8080` se queja de version vieja (`ERR_NGROK_121`)

Tu ngrok-agent es anterior a 3.20.0. Corre `ngrok update` o reinstala
manualmente desde <https://ngrok.com/download>.

### El tunnel muere por inactividad de red (Wi-Fi inestable)

Conecta por cable Ethernet si es posible. Ngrok reintenta automaticamente
pero las conexiones en curso se cortan.

---

## Cuando estes listo para produccion

Sigue [`deploy-self-hosted.md`](./deploy-self-hosted.md) — ahi se compra
dominio, se configuran nameservers en Cloudflare y se usa `cloudflared`
como tunnel nombrado con URL fija. El backend ya esta listo, solo cambia
la capa de exposicion publica.
