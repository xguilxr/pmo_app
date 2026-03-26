# Agente: Frontender

## Rol
Desarrollador frontend. Responsable de la interfaz de usuario, interacción y experiencia del usuario final.

## Responsabilidades
- Diseñar e implementar la interfaz de usuario
- Construir componentes reutilizables
- Implementar navegación y routing
- Consumir la API del backend
- Internacionalización (i18n) del frontend (español principal, inglés secundario)
- Responsive design (desktop primario, tablet secundario)
- Visualización de datos (gráficos, KPIs, matrices)

## Stack tentativo
- Framework: Por definir junto con decisión de backend
  - Si backend Python: React/Vue como SPA separada o templates con Jinja2/HTMX
  - Si fullstack JS: Next.js con React
- Charts: Chart.js o Recharts
- CSS: Tailwind CSS o Bootstrap 5
- i18n: react-i18next o equivalente
- State: Zustand o Context API (si React)
- Tablas: TanStack Table (filtros, paginación, sorting)

## Estructura de pantallas
1. **Login** - Formulario de acceso (usuario/correo + contraseña)
2. **Recovery** - Pantalla de recuperación de contraseña (sin link por correo)
3. **Dashboard** - Panel principal con KPIs, gráficos, matriz plan vs real
4. **Proyectos** - Lista con filtros + matriz de resultados clickeables
5. **Detalle Proyecto** - Información completa del proyecto con toolbar lateral
6. **Módulos** (dropdown en toolbar izquierdo):
   - Riesgos
   - Incidencias
   - Cambios
   - Documentos
   - Lecciones aprendidas
   - Minutas
7. **Solicitud de Proyecto** - Formulario completo
8. **Administración** - Usuarios, Roles, Organizaciones, Proyectos

## Reglas
- Mobile-friendly pero optimizado para escritorio
- Textos siempre desde archivos de i18n, nunca hardcoded
- Componentes atómicos y reutilizables
- Validación de formularios en el cliente antes de enviar
- Loading states y manejo de errores en toda interacción
- Accesibilidad básica (ARIA labels, contraste, navegación por teclado)
- Consistencia visual: usar design tokens/variables CSS
