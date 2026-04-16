# Demostracion Guiada - PMO_APP Platform

**Duracion estimada:** 45-60 minutos
**Audiencia:** Directivos, PMO, Project Managers

---

## Preparacion

### Credenciales de acceso

Creadas por `python -m app.seed --demo`. Cada tenant tiene su propio admin
para que puedas probar todas las funcionalidades aisladamente.

**Super Admin (multi-tenant, panel global)**

| Usuario | Contrasena | Rol |
|---------|-----------|-----|
| admin | Admin123! | Super Administrador |

**Tenant: Grupo Alfa** (`grupo-alfa`)

| Usuario | Contrasena | Rol | Permisos |
|---------|-----------|-----|----------|
| alfa_admin | Alfa123! | Administrador | Acceso total al tenant |
| alfa_pmo | Alfa123! | PMO Manager | Ver/crear/editar portafolio |
| jgarcia | Pm1234! | Project Manager | Gestion de sus proyectos |
| rlopez | Pm1234! | Project Manager | Gestion de sus proyectos |
| alfa_viewer | View123! | Viewer | Solo lectura |

**Tenant: TechNova** (`technova`)

| Usuario | Contrasena | Rol | Permisos |
|---------|-----------|-----|----------|
| nova_admin | Nova123! | Administrador | Acceso total al tenant |
| nova_pmo | Nova123! | PMO Manager | Ver/crear/editar portafolio |
| mrodriguez | Pm1234! | Project Manager | Gestion de sus proyectos |
| dmorales | Pm1234! | Project Manager | Gestion de sus proyectos |
| nova_viewer | View123! | Viewer | Solo lectura |

> Para validar todas las funcionalidades de un tenant, entra con su
> `*_admin` (no con el super admin). El super admin sirve para CRUD de
> tenants y metricas globales.

### Tenants creados desde el superadmin (no-seed)

Cuando creas un tenant desde **Superadmin > Provisionar Tenant**, la
plataforma **siempre** genera un usuario Administrador automaticamente.
Si dejas los campos en blanco, se crea `{slug}_admin` con una contrasena
aleatoria que se muestra una sola vez en la pantalla post-creacion:
copiala antes de cerrar el modal.

### URL de acceso
- **Frontend:** http://localhost:5173
- **API Docs:** http://localhost:8080/docs
- **API Health:** http://localhost:8080/api/health

---

## PARTE 1: Acceso y Seguridad (5 min)

### 1.1 Login y Autenticacion

**Narrar:** *"El sistema utiliza autenticacion JWT con encriptacion bcrypt. Cuenta con proteccion contra ataques de fuerza bruta: tras 5 intentos fallidos, la cuenta se bloquea por 15 minutos."*

**Acciones:**
1. Abrir la aplicacion en el navegador
2. Ingresar con `admin / Admin123!`
3. Mostrar que el sistema redirige al Dashboard
4. Senalar el menu lateral con todos los modulos disponibles

**Puntos clave:**
- Token JWT con expiracion configurable (24h default)
- Sesion se invalida tras 30 min de inactividad
- Soporte bilingue (ES/EN) en toda la interfaz

### 1.2 Sistema de Roles

**Narrar:** *"Contamos con 4 roles pre-configurados con permisos granulares: Administrador, PMO Manager, Project Manager y Viewer. Cada rol tiene una matriz de 36 permisos que combinan 9 modulos con 4 acciones."*

**Acciones:**
1. Ir a **Administracion > Usuarios**
2. Mostrar la lista de usuarios con sus roles
3. Crear un nuevo usuario de prueba con rol "Viewer"
4. Demostrar que el Viewer solo tiene acceso de lectura

---

## PARTE 2: Configuracion Organizacional (5 min)

### 2.1 Organizaciones (Multi-empresa)

**Narrar:** *"El sistema es multi-empresa. Cada organizacion tiene su propio portafolio de proyectos, recursos y metricas. Los datos se filtran automaticamente."*

**Acciones:**
1. Ir a **Organizaciones**
2. Mostrar las organizaciones existentes
3. Crear una nueva organizacion con datos de ejemplo:
   - Nombre: "Grupo Alfa"
   - Razon social: "Grupo Alfa S.A. de C.V."
   - Industria: "Tecnologia"
   - Contacto: datos de ejemplo

### 2.2 Programas (Portafolio)

**Narrar:** *"Los programas agrupan proyectos relacionados dentro de una organizacion. Esto permite gestionar portafolios completos."*

**Acciones:**
1. Ir a **Programas**
2. Crear un programa: "Transformacion Digital 2026"
3. Asociarlo a la organizacion creada

---

## PARTE 3: Ciclo de Vida del Proyecto (15 min)

### 3.1 Solicitud de Proyecto

**Narrar:** *"Todo proyecto inicia con una solicitud formal. El sistema genera un folio unico automaticamente y la solicitud pasa por un flujo de aprobacion."*

**Acciones:**
1. Ir a **Solicitudes de Proyecto**
2. Crear nueva solicitud:
   - Titulo: "Implementacion ERP Cloud"
   - Objetivo: "Migrar el ERP on-premise a la nube"
   - Unidad de Negocio: "Tecnologia"
   - Departamento: "Sistemas"
   - Patrocinador: "Director de TI"
   - Alineacion estrategica: "Transformacion Digital"
   - Beneficios: "Reduccion de costos operativos 30%"
   - Presupuesto: $500,000
   - Consecuencia de no hacer: "Obsolescencia tecnologica"
3. Mostrar el folio generado (REQ-2026-001)
4. **Aprobar la solicitud** - mostrar como cambia el estado
5. Senalar que se genera un **ApprovalLog** automaticamente

### 3.2 Creacion del Proyecto

**Narrar:** *"Una vez aprobada la solicitud, se crea el proyecto formal con toda su informacion base."*

**Acciones:**
1. Ir a **Proyectos > Nuevo**
2. Crear proyecto vinculado a la solicitud:
   - Nombre: "ERP Cloud Migration"
   - Tipo: "Tecnologia"
   - Prioridad: "Alta"
   - Fase: "Planificacion"
   - Fecha inicio: Hoy
   - Fecha fin: +6 meses
   - Presupuesto: $500,000
3. Mostrar el folio PRJ-2026-001
4. Senalar el semaforo de salud (verde por defecto)

### 3.3 Plan de Trabajo (Tareas)

**Narrar:** *"A diferencia de otros sistemas PMO, nosotros permitimos tanto la creacion manual de tareas como la importacion desde Microsoft Project."*

#### Opcion A: Creacion Manual
1. Entrar al detalle del proyecto > Tab **Plan**
2. Crear tarea manual:
   - Nombre: "Analisis de requerimientos"
   - WBS: "1.1"
   - Fechas: proximas 2 semanas
   - Responsable: jgarcia
3. Crear sub-tarea:
   - Nombre: "Levantamiento de procesos"
   - WBS: "1.1.1"
   - Tarea padre: la anterior

#### Opcion B: Importacion MS Project
1. Tab **Plan** > Boton **Importar**
2. Subir archivo .mpp/.xlsx/.csv de ejemplo
3. Mostrar como se sincronizan las tareas automaticamente
4. Senalar el campo `source: ms_project_import`

**Puntos clave:**
- Jerarquia WBS automatica
- Dependencias entre tareas (FS, SS, FF, SF)
- Hitos (milestones) marcados visualmente
- Tracking de retrasos: si la fecha cambia, se marca `was_delayed`

### 3.4 Recursos del Proyecto

**Narrar:** *"Contamos con un modulo completo de gestion de recursos con tarifa por hora, tipo de recurso, disponibilidad y bitacora de horas."*

**Acciones:**
1. Ir a **Recursos** (menu principal)
2. Crear recurso:
   - Nombre: "Juan Garcia"
   - Puesto: "Lider Tecnico"
   - Tipo: "human"
   - Interno: Si
   - Tarifa: $850/hora
   - Departamento: "Desarrollo"
3. **Asignar al proyecto:**
   - POST `/api/resources/projects/{id}/assign`
   - Asignacion: 80%
   - Rol: "Lider Tecnico"
4. **Registrar horas trabajadas:**
   - Fecha: hoy
   - Horas: 8
   - Proyecto: ERP Cloud Migration
   - Notas: "Analisis de requerimientos"
5. **Registrar disponibilidad:**
   - Fecha: manana
   - Horas disponibles: 6
   - Notas: "Reunion de otro proyecto por la manana"

---

## PARTE 4: Gestion de Riesgos y Control (10 min)

### 4.1 Registro de Riesgos

**Narrar:** *"El modulo de riesgos calcula automaticamente la severidad multiplicando probabilidad por impacto en una escala de 1 a 25. Cuando la severidad es alta (>=15), se dispara una notificacion automatica."*

**Acciones:**
1. Tab **Riesgos** del proyecto (o menu Riesgos)
2. Crear riesgo:
   - Titulo: "Resistencia al cambio del personal"
   - Categoria: "Organizacionales"
   - Probabilidad: 4
   - Impacto: 4
   - **Severidad: 16 (auto-calculada)** - mostrar
   - Estrategia: "Plan de gestion del cambio con capacitaciones"
3. Senalar la notificacion automatica generada (severidad >= 15)
4. Crear segundo riesgo con severidad baja para comparar

### 4.2 AIDs (Acciones, Incidencias, Decisiones)

**Narrar:** *"El modulo AID unifica tres tipos de seguimiento en un solo registro, facilitando el tracking de todo lo que sucede en el proyecto."*

**Acciones:**
1. Tab **Issues/AIDs**
2. Crear una Accion:
   - Tipo: "action"
   - Titulo: "Definir arquitectura cloud"
   - Responsable: jgarcia
   - Fecha compromiso: +1 semana
3. Crear una Decision:
   - Tipo: "decision"
   - Titulo: "Se selecciona AWS como proveedor cloud"
   - Prioridad: Alta

### 4.3 Solicitudes de Cambio

**Narrar:** *"Cualquier cambio al alcance, tiempo o costo pasa por un flujo formal de aprobacion con historial completo."*

**Acciones:**
1. Tab **Cambios**
2. Crear solicitud de cambio:
   - Titulo: "Ampliar alcance a modulo de RRHH"
   - Tipo: "scope"
   - Impacto: "2 meses adicionales, +$100K presupuesto"
3. **Aprobar el cambio** - mostrar cambio de estado
4. Verificar que se creo un ApprovalLog

---

## PARTE 5: Documentacion y Conocimiento (5 min)

### 5.1 Documentos

**Acciones:**
1. Tab **Documentos**
2. Subir un documento:
   - Archivo PDF de ejemplo
   - Categoria: "plan"
   - Version: 1
3. Mostrar la descarga del archivo

### 5.2 Lecciones Aprendidas

**Acciones:**
1. Tab **Lecciones**
2. Crear leccion:
   - Titulo: "Sprint planning mejoro con daily standups"
   - Categoria: "success"
   - Fase: "Ejecucion"
   - Recomendacion: "Implementar daily standups en todos los proyectos"

### 5.3 Minutas de Reunion (con IA)

**Narrar:** *"Esta es una de nuestras funcionalidades mas innovadoras. El sistema puede generar minutas automaticamente a partir de una transcripcion de audio usando inteligencia artificial."*

**Acciones:**
1. Tab **Minutas**
2. **Opcion 1 - Manual:** Crear minuta manualmente con participantes, temas, acuerdos
3. **Opcion 2 - Con IA:**
   - Usar el endpoint POST `/api/minutes/generate`
   - Pegar una transcripcion de ejemplo:
     ```
     Juan: Buenos dias, hoy revisamos el avance del sprint 3.
     Maria: El modulo de facturacion esta al 80%, faltan pruebas.
     Pedro: Tenemos un bloqueo con el API del banco, necesitamos credenciales.
     Juan: Pedro, resuelve las credenciales para el viernes. Maria, las pruebas deben estar listas el lunes.
     Maria: De acuerdo, necesito apoyo de QA.
     Juan: Decidido: asignamos a Luis de QA al proyecto esta semana.
     ```
   - Mostrar la minuta generada automaticamente con:
     - Resumen ejecutivo
     - Participantes identificados
     - Temas discutidos
     - Acuerdos con responsables y fechas
     - Decisiones
     - Items RAID extraidos

---

## PARTE 6: Estatus y Cierre del Proyecto (5 min)

### 6.1 Estatus Periodico

**Narrar:** *"Cada semana o periodo, el PM registra un snapshot del estado del proyecto. Esto genera un historico completo para analisis de tendencias."*

**Acciones:**
1. POST `/api/project-statuses`
2. Crear estatus:
   - Fecha: hoy
   - Salud: "yellow"
   - Progreso plan: 40%
   - Progreso real: 35%
   - Resumen: "Ligero retraso por bloqueo con API bancaria"
   - Bloqueadores: "Credenciales de API del banco"
   - Proximos pasos: "Resolver credenciales, completar sprint 3"
3. Crear segundo estatus (semana siguiente) con salud "green"
4. Mostrar el historico de estatus

### 6.2 Cierre Formal del Proyecto

**Narrar:** *"Cuando el proyecto termina, se genera un registro formal de cierre con resumen, resultados, acciones pendientes y aprobacion."*

**Acciones:**
1. POST `/api/project-closures`
2. Crear cierre:
   - Fecha: +6 meses
   - Resumen: "Proyecto completado exitosamente en tiempo y presupuesto"
   - Resultados: "ERP migrado a AWS, 100% de modulos operativos"
   - Acciones pendientes: "Capacitacion de usuarios finales (2 semanas)"
   - Aprobado por: "Director de TI"
3. Aprobar el cierre (status: "approved")
4. Cambiar la fase del proyecto a "Cerrado"

---

## PARTE 7: Reportes con IA (5 min)

### 7.1 Generacion de Reportes

**Narrar:** *"El sistema genera reportes automaticos usando IA. Recopila toda la informacion del proyecto -tareas, riesgos, incidencias, cambios, lecciones- y genera un reporte narrativo profesional."*

**Acciones:**
1. Ir a **Reportes** del proyecto
2. Generar reporte tipo "Avance":
   - POST `/api/reports`
   - tipo: "avance"
   - Periodo: ultimo mes
3. Mostrar el contenido HTML generado por IA
4. Descargar como HTML
5. Senalar metadata: modelo usado, tiempo de generacion

### 7.2 Exportacion RAID

**Acciones:**
1. GET `/api/exports/project-xlsx?project_id=1`
2. Descargar el Excel multi-hoja:
   - Hoja 1: Riesgos
   - Hoja 2: Acciones
   - Hoja 3: Incidencias
   - Hoja 4: Decisiones
3. Mostrar el formato profesional con estilos

---

## PARTE 8: Dashboard y Metricas (5 min)

### 8.1 Dashboard Ejecutivo

**Narrar:** *"El dashboard centraliza todas las metricas del portafolio en una sola vista."*

**Acciones:**
1. Ir al **Dashboard**
2. Mostrar los KPIs:
   - Proyectos activos
   - Solicitudes en revision
   - Riesgos abiertos / severos
   - Cambios en revision
   - Presupuesto total / real / varianza
   - Progreso promedio
   - **[NUEVO]** Proyectos por fase (grafica)
   - **[NUEVO]** Proyectos por salud (semaforo)
   - **[NUEVO]** Top 10 por progreso
   - **[NUEVO]** Total de recursos
3. Filtrar por organizacion

### 8.2 Dashboard Compartido (Publico)

**Narrar:** *"Para directivos o stakeholders externos, podemos generar links publicos del dashboard con PIN y fecha de expiracion, sin necesidad de cuenta."*

**Acciones:**
1. POST `/api/dashboard-share/links`
   - Organizacion: la creada
   - Label: "Dashboard Directivo Q2"
   - PIN: "1234"
   - Expiracion: +30 dias
2. Copiar el token generado
3. Acceder via GET `/api/dashboard-share/public/{token}?pin=1234`
4. Mostrar las metricas publicas (sin autenticacion)

---

## PARTE 9: Notificaciones (3 min)

### 9.1 Centro de Notificaciones

**Narrar:** *"El sistema genera notificaciones automaticas ante eventos importantes. Los usuarios reciben alertas en tiempo real."*

**Acciones:**
1. Ir a **Notificaciones** (campana en el header)
2. Mostrar las notificaciones generadas automaticamente:
   - "Proyecto creado: ERP Cloud Migration"
   - "Riesgo de alta severidad registrado"
   - "Tarea asignada: Analisis de requerimientos"
   - "Solicitud de cambio aprobada"
3. Marcar una como leida
4. Mostrar el conteo de no leidas actualizado

---

## PARTE 10: Auditoria y Trazabilidad (2 min)

### 10.1 Logs de Auditoria

**Narrar:** *"Todas las acciones criticas quedan registradas en el log de auditoria para cumplimiento normativo y trazabilidad."*

**Acciones:**
1. GET `/api/audit-logs`
2. Mostrar los registros:
   - Aprobacion de solicitudes
   - Rechazo de cambios
   - Acciones con timestamp, usuario y detalles

### 10.2 Historial de Aprobaciones

1. GET `/api/approval-logs?approvable_type=project_request`
2. Mostrar el historial polimorfico de aprobaciones

---

## Cierre de la Demostracion

### Resumen de Diferenciadores Clave

1. **Arquitectura moderna** - API-first con React SPA, no monolito
2. **Inteligencia Artificial** - Minutas y reportes generados con IA (Ollama/Claude)
3. **90+ endpoints REST** - API completa para integraciones
4. **Tareas manuales + importacion** - Flexibilidad total
5. **Dependencias de tareas** - FS/SS/FF/SF (base para Gantt futuro)
6. **Backlog de producto** - Para proyectos agiles
7. **Objetivos con KPIs** - Medicion de resultados
8. **Programas (portafolio)** - Agrupacion jerarquica
9. **Notificaciones in-app** - 9 tipos de eventos automaticos
10. **Exportacion RAID** - Excel multi-hoja profesional
11. **Bilingue** - Espanol e Ingles
12. **Dashboard compartido** - Links publicos con PIN

### Proximos Pasos (Roadmap)

| Funcionalidad | Prioridad | Timeline |
|--------------|-----------|----------|
| Diagrama Gantt interactivo | Alta | Q3 2026 |
| Notificaciones por email (SMTP) | Media | Q2 2026 |
| Tablero Kanban | Media | Q3 2026 |
| Formulario publico de solicitudes | Baja | Q2 2026 |
| Dashboard personalizable | Baja | Q4 2026 |
| App movil (PWA) | Baja | Q4 2026 |

---

### Preguntas y Respuestas

*Espacio para preguntas de la audiencia*

---

*Demostracion preparada para PMO_APP v2.0 - 6 de abril de 2026*
