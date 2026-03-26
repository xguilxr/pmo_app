export interface Project {
  id: number;
  folio: string;
  name: string;
  type: string;
  priority: 'Alta' | 'Media' | 'Baja';
  company: string;
  phase: 'Planificación' | 'Ejecución' | 'Soporte' | 'Cerrado';
  progress: number;
  plannedProgress: number;
  budget: number;
  realBudget: number;
  startDate: string;
  endDate: string;
  health: 'green' | 'yellow' | 'red';
}

export const projects: Project[] = [
  { id: 1, folio: 'PRJ-2026-001', name: 'Migración ERP SAP', type: 'Tecnología', priority: 'Alta', company: 'Grupo Alfa', phase: 'Ejecución', progress: 65, plannedProgress: 70, budget: 2500000, realBudget: 1800000, startDate: '2026-01-15', endDate: '2026-08-30', health: 'yellow' },
  { id: 2, folio: 'PRJ-2026-002', name: 'Portal Clientes B2B', type: 'Digital', priority: 'Alta', company: 'TechNova', phase: 'Ejecución', progress: 45, plannedProgress: 40, budget: 1200000, realBudget: 520000, startDate: '2026-02-01', endDate: '2026-07-15', health: 'green' },
  { id: 3, folio: 'PRJ-2026-003', name: 'Automatización Nómina', type: 'Procesos', priority: 'Media', company: 'Grupo Alfa', phase: 'Planificación', progress: 15, plannedProgress: 20, budget: 800000, realBudget: 120000, startDate: '2026-03-01', endDate: '2026-09-30', health: 'yellow' },
  { id: 4, folio: 'PRJ-2026-004', name: 'App Móvil Ventas', type: 'Digital', priority: 'Alta', company: 'Distribuidora MX', phase: 'Ejecución', progress: 80, plannedProgress: 75, budget: 950000, realBudget: 780000, startDate: '2025-11-01', endDate: '2026-05-15', health: 'green' },
  { id: 5, folio: 'PRJ-2026-005', name: 'Rediseño Website Corporativo', type: 'Digital', priority: 'Baja', company: 'TechNova', phase: 'Soporte', progress: 95, plannedProgress: 100, budget: 350000, realBudget: 340000, startDate: '2025-09-01', endDate: '2026-03-31', health: 'green' },
  { id: 6, folio: 'PRJ-2026-006', name: 'Implementación CRM Salesforce', type: 'Tecnología', priority: 'Alta', company: 'Servicios Global', phase: 'Ejecución', progress: 30, plannedProgress: 50, budget: 3200000, realBudget: 1900000, startDate: '2025-12-01', endDate: '2026-10-31', health: 'red' },
  { id: 7, folio: 'PRJ-2026-007', name: 'Data Warehouse Analytics', type: 'Tecnología', priority: 'Media', company: 'Grupo Alfa', phase: 'Planificación', progress: 10, plannedProgress: 12, budget: 1800000, realBudget: 95000, startDate: '2026-03-15', endDate: '2026-12-31', health: 'green' },
  { id: 8, folio: 'PRJ-2026-008', name: 'Certificación ISO 27001', type: 'Procesos', priority: 'Media', company: 'Servicios Global', phase: 'Ejecución', progress: 55, plannedProgress: 60, budget: 600000, realBudget: 350000, startDate: '2026-01-01', endDate: '2026-06-30', health: 'yellow' },
  { id: 9, folio: 'PRJ-2025-012', name: 'Renovación Infraestructura Red', type: 'Infraestructura', priority: 'Alta', company: 'Distribuidora MX', phase: 'Cerrado', progress: 100, plannedProgress: 100, budget: 2100000, realBudget: 2250000, startDate: '2025-06-01', endDate: '2026-01-31', health: 'green' },
  { id: 10, folio: 'PRJ-2026-009', name: 'Sistema de Facturación 4.0', type: 'Regulatorio', priority: 'Alta', company: 'Grupo Alfa', phase: 'Ejecución', progress: 70, plannedProgress: 65, budget: 450000, realBudget: 310000, startDate: '2026-01-10', endDate: '2026-04-30', health: 'green' },
];

export const kpis = {
  activeProjects: projects.filter(p => p.phase !== 'Cerrado').length,
  requestsInReview: 4,
  openRisks: 12,
  changesInReview: 3,
  totalBudget: projects.filter(p => p.phase !== 'Cerrado').reduce((s, p) => s + p.budget, 0),
  avgProgress: Math.round(projects.filter(p => p.phase !== 'Cerrado').reduce((s, p) => s + p.progress, 0) / projects.filter(p => p.phase !== 'Cerrado').length),
  severeRisks: 3,
  openAids: 8,
};

export const projectsByPhase = [
  { name: 'Planificación', value: projects.filter(p => p.phase === 'Planificación').length, color: '#3b82f6' },
  { name: 'Ejecución', value: projects.filter(p => p.phase === 'Ejecución').length, color: '#f59e0b' },
  { name: 'Soporte', value: projects.filter(p => p.phase === 'Soporte').length, color: '#8b5cf6' },
  { name: 'Cerrado', value: projects.filter(p => p.phase === 'Cerrado').length, color: '#6b7280' },
];

export const avgProgressByPhase = [
  { phase: 'Planificación', progress: 12 },
  { phase: 'Ejecución', progress: 58 },
  { phase: 'Soporte', progress: 95 },
  { phase: 'Cerrado', progress: 100 },
];

export const budgetByType = [
  { type: 'Tecnología', budget: 7500000 },
  { type: 'Digital', budget: 2500000 },
  { type: 'Procesos', budget: 1400000 },
  { type: 'Infraestructura', budget: 2100000 },
  { type: 'Regulatorio', budget: 450000 },
];

export const portfolioHealth = [
  { name: 'Sano', value: projects.filter(p => p.health === 'green').length, color: '#22c55e' },
  { name: 'Atención', value: projects.filter(p => p.health === 'yellow').length, color: '#f59e0b' },
  { name: 'Crítico', value: projects.filter(p => p.health === 'red').length, color: '#ef4444' },
];

export const companies = ['Grupo Alfa', 'TechNova', 'Distribuidora MX', 'Servicios Global'];
export const projectTypes = ['Tecnología', 'Digital', 'Procesos', 'Infraestructura', 'Regulatorio'];
export const priorities = ['Alta', 'Media', 'Baja'];
