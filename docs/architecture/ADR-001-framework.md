# ADR-001: Selección de Framework y Stack Tecnológico

**Estado:** Pendiente de decisión
**Fecha:** 2026-03-26
**Decisores:** Equipo de desarrollo

## Contexto
Se necesita definir el stack tecnológico para la plataforma PMO como servicio. Existe una versión anterior en Railway y una nueva implementación con Waitress. Se debe decidir antes de comenzar el desarrollo.

## Opciones evaluadas

### Opción A: Python (FastAPI) + Railway + React SPA
- **Backend:** FastAPI + Uvicorn, SQLAlchemy 2.0, Pydantic, JWT
- **Frontend:** React + Vite, Tailwind CSS, Chart.js
- **Infra:** Railway (app + PostgreSQL + Redis)
- **Pros:** Alta performance (async), docs automáticos (Swagger), tipado fuerte, ecosistema maduro
- **Contras:** Dos proyectos separados (front/back), CORS a manejar

### Opción B: Python (Flask/Waitress) + Railway + Templates
- **Backend:** Flask + Waitress, SQLAlchemy, Jinja2 + HTMX
- **Frontend:** Server-side rendering con Jinja2, HTMX para interactividad
- **Infra:** Railway (app + PostgreSQL)
- **Pros:** Un solo deploy, simplicidad, sin CORS, buen SEO
- **Contras:** Menos interactividad, UI limitada para dashboards complejos

### Opción C: Next.js (Fullstack) + Vercel
- **Backend:** API Routes (Node.js), Prisma ORM
- **Frontend:** React SSR/SSG, Tailwind CSS, Recharts
- **Infra:** Vercel (app) + Neon/Supabase (DB)
- **Pros:** Fullstack JS, SSR, excelente DX, Vercel free tier generoso
- **Contras:** Serverless limits, vendor lock-in, más piezas de infra

### Opción D: Python (FastAPI) + Railway + HTMX (Híbrido)
- **Backend:** FastAPI + Jinja2 templates + HTMX para interactividad
- **Frontend:** HTMX + Alpine.js para interactividad, Chart.js para gráficos
- **Infra:** Railway (app + PostgreSQL)
- **Pros:** Un solo deploy, Python puro, interactividad sin SPA, simplicidad
- **Contras:** Ecosistema HTMX más pequeño, menos componentes pre-hechos

## Criterios de evaluación
| Criterio                  | Peso | A (FastAPI+React) | B (Flask+Jinja2) | C (Next.js) | D (FastAPI+HTMX) |
|---------------------------|------|--------------------|-------------------|-------------|-------------------|
| Velocidad de desarrollo   | 20%  | ★★★☆               | ★★★★              | ★★★☆        | ★★★★              |
| Performance               | 15%  | ★★★★               | ★★★☆              | ★★★★        | ★★★★              |
| Complejidad de deploy     | 15%  | ★★☆☆               | ★★★★              | ★★★☆        | ★★★★              |
| UI/UX para dashboards     | 20%  | ★★★★               | ★★☆☆              | ★★★★        | ★★★☆              |
| Costo de infra            | 10%  | ★★★☆               | ★★★★              | ★★★☆        | ★★★★              |
| Mantenibilidad            | 10%  | ★★★☆               | ★★★☆              | ★★★★        | ★★★☆              |
| Soporte i18n              | 10%  | ★★★★               | ★★★☆              | ★★★★        | ★★★☆              |

## Decisión
**Pendiente.** Se recomienda evaluar Opción A (FastAPI + React) u Opción D (FastAPI + HTMX) como finalistas.

## Consecuencias
Se documentarán una vez tomada la decisión.
