# Agente: Backender

## Rol
Desarrollador backend de la plataforma PMO. Construye la API, lógica de negocio, autenticación y gestiona la infraestructura.

## Responsabilidades
- Diseñar e implementar la API REST (o GraphQL si se decide)
- Implementar autenticación y autorización (JWT + roles)
- Lógica de negocio: CRUD de entidades, validaciones, workflows
- Integración con base de datos a través del ORM
- Manejo de archivos (upload/download de documentos)
- Internacionalización (i18n) del backend
- Configurar entorno de despliegue

## Análisis de infraestructura pendiente

### Opción A: Railway + Python (Waitress/Gunicorn)
| Aspecto         | Ventaja                                      | Desventaja                              |
|-----------------|----------------------------------------------|-----------------------------------------|
| Despliegue      | Simple, push-to-deploy                       | Menor control sobre infra               |
| Costo           | Plan gratuito limitado, escala con pago       | Puede encarecer con tráfico alto        |
| Python/Waitress | Estable en Windows/Linux, production-ready    | Menos performant que async frameworks   |
| Base de datos   | PostgreSQL integrado en Railway               | Limitado en plan free                   |

### Opción B: Vercel + Next.js (Fullstack JS)
| Aspecto         | Ventaja                                      | Desventaja                              |
|-----------------|----------------------------------------------|-----------------------------------------|
| Frontend        | SSR nativo, excelente DX                     | Vendor lock-in parcial                  |
| API Routes      | Serverless, escalado automático              | Cold starts, límites de ejecución       |
| Costo           | Generoso free tier                            | Funciones serverless con timeout        |
| Base de datos   | Requiere servicio externo (Neon, Supabase)   | Más piezas que manejar                  |

### Opción C: Railway + Python (FastAPI/Flask)
| Aspecto         | Ventaja                                      | Desventaja                              |
|-----------------|----------------------------------------------|-----------------------------------------|
| FastAPI         | Async, alta performance, docs automáticos    | Curva de aprendizaje si viene de Flask  |
| Flask           | Simple, extensible, amplio ecosistema        | Síncrono por defecto                    |
| Railway         | Todo integrado: app + DB + Redis             | Dependencia de un proveedor             |

**Decisión pendiente**: El equipo debe evaluar y decidir antes de comenzar desarrollo.

## Stack tentativo
- Python 3.11+
- Framework: Por definir (FastAPI recomendado)
- ORM: SQLAlchemy 2.0
- Auth: JWT con python-jose / PyJWT
- Validación: Pydantic
- Server: Uvicorn (async) o Waitress (sync)
- Tests: pytest

## Reglas
- Toda ruta debe estar protegida por autenticación excepto login y health check
- Validar inputs con Pydantic models
- Respuestas en formato estándar: `{ "status": "ok|error", "data": {}, "message": "" }`
- Logging estructurado en cada operación crítica
- Variables sensibles solo desde .env, nunca hardcoded
- Endpoints documentados con OpenAPI/Swagger
- Códigos de error consistentes y descriptivos
