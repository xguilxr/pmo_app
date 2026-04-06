# Comparativa: DRC-PMO vs PMO_APP

**Fecha:** 6 de abril de 2026

---

## Resumen Ejecutivo

| Aspecto | DRC-PMO | PMO_APP |
|---------|---------|---------|
| **Stack** | Laravel (PHP) + Blade + PostgreSQL | FastAPI (Python) + React (TS) + PostgreSQL |
| **Frontend** | Blade Templates (server-rendered) | React 19 + Vite + Tailwind (SPA) |
| **Autenticacion** | Session-based + API tokens | JWT (Bearer) + bcrypt |
| **AI** | No | SI (Ollama + Claude API) |
| **Arquitectura** | Monolito MVC | API REST separada + SPA |

**PMO_APP cubre 35 de 42 funcionalidades del DRC-PMO, supera en 12 areas, y tiene 7 gaps por cerrar.**

---

## Tabla Comparativa Completa

| # | Funcionalidad | DRC-PMO | PMO_APP | Notas PMO_APP |
|---|--------------|---------|---------|---------------|
| 1 | Gestion de Usuarios | SI | **SI** | CRUD completo, soft-delete, bloqueo por intentos fallidos, security questions |
| 2 | Roles y Permisos granulares | SI (6 roles) | **SI (4 roles)** | 4 roles (Admin, PMO Manager, PM, Viewer) + permisos por modulo/accion. Menos roles pero estructura extensible |
| 3 | Gestion de Empresas/Clientes | SI | **SI** | Modelo Organization con datos de contacto, industria, pais, logo. Cascade soft-delete |
| 4 | Solicitudes de Proyecto (intake) | SI | **SI** | Modelo completo con folio REQ-YYYY-NNNNN, flujo approve/reject/cancel, campos equivalentes |
| 5 | Formulario publico sin login | SI | **NO** | Todas las solicitudes requieren autenticacion JWT |
| 6 | Gestion de Proyectos completa | SI | **SI** | Folio, fases, salud (semaforo), presupuesto plan vs real, progreso plan vs real |
| 7 | Edicion manual de Tareas | NO (solo MPP) | **SI** | CRUD manual + importacion. Ventaja clara sobre DRC |
| 8 | Importacion Microsoft Project | SI (.mpp/.xml/.csv) | **SI** | .mpp/.mpx/.xml via Java/mpxj + .xlsx/.csv con parsing flexible multi-idioma |
| 9 | Diagrama Gantt | NO | **NO** | Backend soporta WBS/jerarquia pero no hay componente Gantt en frontend |
| 10 | Tablero Kanban | NO | **NO** | No implementado en ninguno |
| 11 | Gestion de Recursos | SI (modelo dedicado) | **PARCIAL** | No hay modelo Resource dedicado. Recursos son Users asignados a proyectos con rol. Sin tarifa/hora, sin perfil de recurso independiente |
| 12 | Bitacora de Horas (Work Logs) | SI | **NO** | No existe modulo de time tracking / work logs |
| 13 | Disponibilidad de Recursos | SI | **NO** | No hay modelo de disponibilidad por fecha |
| 14 | Gestion de Riesgos | SI | **SI** | Folio RSK, probabilidad/impacto (1-5, mas granular que DRC 1-3), severidad auto, estado, planes de mitigacion |
| 15 | Severidad calculada auto | SI (prob x impact) | **SI** | Escala 1-25 (5x5) vs DRC 1-9 (3x3). Mas granular |
| 16 | AIDs (Acciones/Incidencias/Decisiones) | SI | **SI** | Issues con type: action/issue/decision. Exportacion RAID en Excel multi-hoja |
| 17 | Solicitudes de Cambio | SI | **SI** | Folio CHG, tipos (scope/time/cost/resource), flujo de aprobacion, impacto |
| 18 | Flujo de Aprobacion | SI (1 nivel) | **SI (1 nivel)** | Aprobacion directa en solicitudes y cambios. reviewed_by + review_date |
| 19 | Aprobacion multi-nivel | NO | **NO** | Ninguno tiene workflow multi-paso |
| 20 | Documentos de Proyecto | SI (archivos + links) | **SI** | Folio DOC, categorias (plan/report/contract/artefacto), versionado, 50MB max, +20 extensiones |
| 21 | Lecciones Aprendidas | SI | **SI** | Folio LEC, categorias (success/improvement/error) vs DRC (BIEN/MAL). Mas categorias |
| 22 | Minutas de Reunion | SI | **SI+** | Folio MIN + generacion IA desde transcripciones. Formato Markdown estructurado. Ventaja significativa |
| 23 | Cierre de Proyecto | SI (modelo dedicado) | **PARCIAL** | Se maneja via fase "Cerrado" + reporte de cierre IA. No hay modelo ProjectClosure dedicado |
| 24 | Estatus Periodico (semaforo) | SI (modelo dedicado) | **PARCIAL** | Salud en proyecto (green/yellow/red) pero no hay modelo ProjectStatus para historico periodico |
| 25 | Dashboard Ejecutivo | SI (20+ metricas) | **SI (8 KPIs)** | Metricas: proyectos activos, solicitudes en revision, riesgos abiertos/severos, cambios, presupuesto, progreso, AIDs. Menos metricas que DRC |
| 26 | Dashboard Compartido (publico) | SI | **NO** | No hay share links, PIN, ni dashboard publico |
| 27 | Reportes y Metricas | SI (17+ tipos) | **SI+** | 4 tipos de reportes (Avance, Seguimiento, Ejecutivo, Cierre) con generacion IA. Calidad superior, cantidad menor |
| 28 | Exportacion a Excel/PDF | PARCIAL (solo logs) | **SI** | CSV individual por modulo + XLSX multi-hoja RAID + templates de importacion + reportes HTML. Mucho mas completo |
| 29 | API REST | BASICA (3 endpoints) | **SI (22 routers)** | API completa para todos los modulos. Arquitectura API-first. Ventaja masiva |
| 30 | Notificaciones Email | SI | **NO** | Modelo soporta email pero no hay implementacion SMTP |
| 31 | Notificaciones in-app | NO | **SI** | Sistema completo: 9 tipos de eventos, unread count, mark as read. Ventaja sobre DRC |
| 32 | Chat/Comentarios | NO | **NO** | Ninguno tiene |
| 33 | Integracion Calendario | NO | **NO** | Ninguno tiene |
| 34 | CAPTCHA | SI (Turnstile) | **NO** | No hay CAPTCHA (tampoco hay formulario publico que lo necesite) |
| 35 | Branding Personalizable | SI | **SI** | Sistema de branding con colores, logos, multiples perfiles por organizacion |
| 36 | Logs de Acceso + Geo | SI (completo) | **PARCIAL** | Modelo AuditLog existe pero no esta integrado activamente en los endpoints |
| 37 | Multi-empresa | SI | **SI** | Filtrado por organizacion, relacion users-organizations many-to-many |
| 38 | Impresion de Documentos | SI | **NO** | No hay vistas de impresion dedicadas |
| 39 | Dependencias entre Tareas | NO | **SI** | Modelo TaskDependency con tipos FS/SS/FF/SF. Ventaja sobre DRC |
| 40 | Automatizaciones/Triggers | NO | **PARCIAL** | Notificaciones automaticas ante eventos (crear riesgo, cambiar fase, etc.) |
| 41 | Time tracking a nivel tarea | NO | **NO** | Ninguno tiene |
| 42 | Dashboard personalizable | NO | **NO** | Ninguno tiene |

---

## Funcionalidades EXCLUSIVAS de PMO_APP (no existen en DRC-PMO)

| # | Funcionalidad | Descripcion |
|---|--------------|-------------|
| A1 | **Motor de IA (Ollama + Claude)** | Generacion automatica de minutas desde transcripciones y reportes de avance/cierre con IA |
| A2 | **Programas (Portafolio)** | Nivel jerarquico Organization > Program > Project. DRC no tiene programas |
| A3 | **Backlog de Producto** | Modulo BacklogItem con folio BLG, prioridad, estado, progreso, seguimiento de retrasos |
| A4 | **Objetivos de Proyecto (KPIs)** | Modelo ProjectObjective con tipos (general/specific/kpi), valor target vs actual, progreso |
| A5 | **Areas de Proyecto (Stakeholders)** | Modelo ProjectArea para mapear roles en proyecto (Sponsor, Lider Tecnico, Analista, etc.) |
| A6 | **Dependencias entre Tareas** | TaskDependency con 4 tipos (FS/SS/FF/SF). Base para futuro Gantt |
| A7 | **Templates de Importacion** | Descarga de templates .xlsx para tareas y backlog con datos de ejemplo |
| A8 | **Exportacion RAID multi-hoja** | Excel con hojas separadas: Riesgos, Acciones, Incidencias, Decisiones |
| A9 | **Arquitectura API-first (SPA)** | Frontend React desacoplado, 22 routers REST completos |
| A10 | **Notificaciones In-App** | Sistema de notificaciones con 9 tipos de eventos, conteo de no leidas |
| A11 | **Delay Tracking** | Campos was_delayed y original_end_date en tareas y backlog para rastrear retrasos historicos |
| A12 | **Soft Delete universal** | TimestampMixin con deleted_at en todos los modelos. Datos recuperables |

---

## GAPS: Lo que falta en PMO_APP para cubrir DRC-PMO

### Criticos (necesarios para paridad)

| # | Gap | Descripcion | Esfuerzo Estimado |
|---|-----|-------------|-------------------|
| G1 | **Modelo de Recursos dedicado** | DRC tiene tabla `resources` con tarifa/hora, tipo, departamento, ubicacion, interno/externo + tabla pivote `project_resource` con % asignacion. PMO_APP usa Users directamente. | Alto |
| G2 | **Work Logs (Bitacora de Horas)** | DRC tiene `resource_work_logs` con fecha, horas, proyecto, notas. PMO_APP no tiene time tracking. | Medio |
| G3 | **Disponibilidad de Recursos** | DRC tiene `resource_availabilities` con horas disponibles por fecha. | Medio |
| G4 | **Estatus Periodico de Proyecto** | DRC tiene modelo `project_statuses` para capturar salud/progreso/bloqueadores en cada corte. PMO_APP solo tiene el campo health en el proyecto, sin historico. | Medio |
| G5 | **Cierre de Proyecto formal** | DRC tiene modelo `project_closures` (resumen, resultados, acciones pendientes, aprobador). PMO_APP lo maneja via fase + reporte IA sin modelo dedicado. | Bajo |
| G6 | **Dashboard compartido publico** | DRC tiene `dashboard_share_links` con token, PIN, expiracion. PMO_APP no tiene. | Medio |
| G7 | **Logs de Acceso activos** | DRC registra cada request con IP, geolocalizacion, duracion, ISP. PMO_APP tiene modelo AuditLog pero no esta conectado a los endpoints. | Medio |

### Menores (nice-to-have para paridad completa)

| # | Gap | Descripcion | Esfuerzo |
|---|-----|-------------|----------|
| G8 | **Formulario publico sin login** | DRC permite crear solicitudes sin autenticacion. En PMO_APP se puede agregar un endpoint publico. | Bajo |
| G9 | **Notificaciones por Email** | DRC usa Laravel Notifications para email. PMO_APP tiene el modelo pero no SMTP. | Medio |
| G10 | **CAPTCHA** | DRC usa Cloudflare Turnstile. Solo necesario si se implementa G8. | Bajo |
| G11 | **Vistas de impresion** | DRC tiene vistas de impresion para proyectos, solicitudes, estatus. | Bajo |
| G12 | **Exportacion de logs a Excel** | DRC exporta access_logs a Excel. PMO_APP ya exporta otros modulos, solo falta logs. | Bajo |
| G13 | **Approval Logs polimorficos** | DRC tiene `approval_logs` con historial de aprobaciones. PMO_APP registra reviewer pero sin historial. | Bajo |
| G14 | **Mas metricas en Dashboard** | DRC tiene 20+ metricas vs 8 en PMO_APP. Ampliar con presupuesto por tipo, por empresa, top proyectos, etc. | Medio |

---

## Matriz de Prioridad para cerrar gaps

```
                    IMPACTO ALTO
                        |
           G1 Recursos  |  G4 Estatus Periodico
           G2 Work Logs |  G14 Metricas Dashboard
                        |
  ESFUERZO ALTO --------+-------- ESFUERZO BAJO
                        |
           G6 Dashboard |  G5 Cierre formal
              Compartido|  G13 Approval Logs
           G9 Email     |  G8 Form publico
                        |
                    IMPACTO BAJO
```

---

## Resumen Cuantitativo

| Metrica | DRC-PMO | PMO_APP |
|---------|---------|---------|
| Modelos de datos | 24 tablas | 20 modelos (+TaskDependency) |
| Roles del sistema | 6 | 4 |
| Endpoints API | 3 | **80+** (22 routers) |
| Modulos con permisos | 13 | 9 |
| Tipos de exportacion | 1 (logs Excel) | **6+** (CSV por modulo + XLSX RAID + templates) |
| Tipos de reportes | 17+ metricas fijas | **4 tipos con generacion IA** |
| Notificaciones | Email only | **In-app (9 tipos)** |
| Integracion IA | No | **Si (Ollama + Claude)** |
| Niveles jerarquicos | Empresa > Proyecto | **Org > Programa > Proyecto** |
| Gestion de tareas | Solo importacion | **Manual + Importacion** |
| Dependencias tareas | No | **Si (FS/SS/FF/SF)** |
| Backlog de producto | No | **Si** |
| Objetivos/KPIs | No | **Si** |

---

## Conclusion

**PMO_APP es arquitectonicamente superior** (API-first, SPA moderna, IA integrada) y ya supera a DRC-PMO en varias areas clave (tareas manuales, dependencias, backlog, IA, exportaciones, notificaciones in-app, API completa).

**Para igualar la cobertura funcional de DRC-PMO**, los esfuerzos deben centrarse en:

1. **Gestion de Recursos** (G1, G2, G3) - Es el gap mas grande. Crear modelo Resource separado de User, con work logs y disponibilidad.
2. **Estatus Periodico** (G4) - Modelo para capturar snapshots periodicos del proyecto.
3. **Dashboard** (G6, G14) - Ampliar metricas y agregar dashboard compartido.
4. **Cierre formal** (G5) - Modelo dedicado ProjectClosure.
5. **Audit Logs** (G7) - Activar el modelo existente en los endpoints.
6. **Email** (G9) - Implementar envio SMTP para las notificaciones existentes.

Con estos 6 grupos de mejoras, PMO_APP no solo igualaria sino superaria significativamente a DRC-PMO en todas las dimensiones.
