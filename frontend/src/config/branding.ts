import { API_BASE_URL } from '../services/api';

export interface BrandingConfig {
  orgId: string;
  orgName: string;
  logoUrl: string | null;
  logoText: string;
  primaryColor: string;        // Tailwind color name (blue, indigo, emerald, etc.)
  accentColor: string;
  favicon: string | null;
  loginSubtitle: string;
  supportEmail: string;
}

// Default brandings for each organization
const brandings: Record<string, BrandingConfig> = {
  default: {
    orgId: 'default',
    orgName: 'PMO Platform',
    logoUrl: null,
    logoText: 'PMO Platform',
    primaryColor: 'blue',
    accentColor: 'indigo',
    favicon: null,
    loginSubtitle: 'Project Management Office',
    supportEmail: 'soporte@pmo-platform.com',
  },
  org1: {
    orgId: 'org1',
    orgName: 'Grupo Alfa PMO',
    logoUrl: null,
    logoText: 'Grupo Alfa',
    primaryColor: 'emerald',
    accentColor: 'teal',
    favicon: null,
    loginSubtitle: 'Oficina de Gestion de Proyectos',
    supportEmail: 'pmo@grupoalfa.com',
  },
  org2: {
    orgId: 'org2',
    orgName: 'TechNova PMO',
    logoUrl: null,
    logoText: 'TechNova',
    primaryColor: 'violet',
    accentColor: 'purple',
    favicon: null,
    loginSubtitle: 'Innovation & Project Office',
    supportEmail: 'pmo@technova.com',
  },
};

// Color mapping for Tailwind classes (since Tailwind needs full class names at build time)
export const colorMap: Record<string, {
  bg50: string; bg100: string; bg600: string; bg700: string;
  text600: string; text700: string; text50: string;
  border200: string;
  hover700: string;
  ring: string;
}> = {
  blue: {
    bg50: 'bg-blue-50', bg100: 'bg-blue-100', bg600: 'bg-blue-600', bg700: 'bg-blue-700',
    text600: 'text-blue-600', text700: 'text-blue-700', text50: 'text-blue-50',
    border200: 'border-blue-200',
    hover700: 'hover:bg-blue-700',
    ring: 'focus:ring-blue-500',
  },
  emerald: {
    bg50: 'bg-emerald-50', bg100: 'bg-emerald-100', bg600: 'bg-emerald-600', bg700: 'bg-emerald-700',
    text600: 'text-emerald-600', text700: 'text-emerald-700', text50: 'text-emerald-50',
    border200: 'border-emerald-200',
    hover700: 'hover:bg-emerald-700',
    ring: 'focus:ring-emerald-500',
  },
  violet: {
    bg50: 'bg-violet-50', bg100: 'bg-violet-100', bg600: 'bg-violet-600', bg700: 'bg-violet-700',
    text600: 'text-violet-600', text700: 'text-violet-700', text50: 'text-violet-50',
    border200: 'border-violet-200',
    hover700: 'hover:bg-violet-700',
    ring: 'focus:ring-violet-500',
  },
  indigo: {
    bg50: 'bg-indigo-50', bg100: 'bg-indigo-100', bg600: 'bg-indigo-600', bg700: 'bg-indigo-700',
    text600: 'text-indigo-600', text700: 'text-indigo-700', text50: 'text-indigo-50',
    border200: 'border-indigo-200',
    hover700: 'hover:bg-indigo-700',
    ring: 'focus:ring-indigo-500',
  },
  teal: {
    bg50: 'bg-teal-50', bg100: 'bg-teal-100', bg600: 'bg-teal-600', bg700: 'bg-teal-700',
    text600: 'text-teal-600', text700: 'text-teal-700', text50: 'text-teal-50',
    border200: 'border-teal-200',
    hover700: 'hover:bg-teal-700',
    ring: 'focus:ring-teal-500',
  },
  purple: {
    bg50: 'bg-purple-50', bg100: 'bg-purple-100', bg600: 'bg-purple-600', bg700: 'bg-purple-700',
    text600: 'text-purple-600', text700: 'text-purple-700', text50: 'text-purple-50',
    border200: 'border-purple-200',
    hover700: 'hover:bg-purple-700',
    ring: 'focus:ring-purple-500',
  },
  rose: {
    bg50: 'bg-rose-50', bg100: 'bg-rose-100', bg600: 'bg-rose-600', bg700: 'bg-rose-700',
    text600: 'text-rose-600', text700: 'text-rose-700', text50: 'text-rose-50',
    border200: 'border-rose-200',
    hover700: 'hover:bg-rose-700',
    ring: 'focus:ring-rose-500',
  },
  amber: {
    bg50: 'bg-amber-50', bg100: 'bg-amber-100', bg600: 'bg-amber-600', bg700: 'bg-amber-700',
    text600: 'text-amber-600', text700: 'text-amber-700', text50: 'text-amber-50',
    border200: 'border-amber-200',
    hover700: 'hover:bg-amber-700',
    ring: 'focus:ring-amber-500',
  },
};

let currentBranding: BrandingConfig = brandings.default;

export function setBranding(orgId: string) {
  currentBranding = brandings[orgId] || brandings.default;
}

export function getBranding(): BrandingConfig {
  return currentBranding;
}

export function getColors() {
  return colorMap[currentBranding.primaryColor] || colorMap.blue;
}

// API-driven branding: map hex color to nearest Tailwind color name
const hexToTailwind: Record<string, string> = {
  '#3B82F6': 'blue', '#6366F1': 'indigo', '#10B981': 'emerald',
  '#14B8A6': 'teal', '#8B5CF6': 'violet', '#A855F7': 'purple',
  '#EF4444': 'rose', '#F59E0B': 'amber', '#D97706': 'amber',
  '#F43F5E': 'rose',
};

function hexToNearestTailwind(hex: string): string {
  return hexToTailwind[hex?.toUpperCase()] || 'blue';
}

export interface ApiBranding {
  tenant_id: number | null;
  org_name: string;
  slug: string | null;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  favicon: string | null;
  app_name: string;
  login_subtitle: string;
  support_email: string;
}

export function applyApiBranding(data: ApiBranding) {
  const orgId = data.slug || 'api';
  brandings[orgId] = {
    orgId,
    orgName: data.org_name,
    logoUrl: data.logo_url,
    logoText: data.app_name,
    primaryColor: hexToNearestTailwind(data.primary_color),
    accentColor: hexToNearestTailwind(data.secondary_color),
    favicon: data.favicon,
    loginSubtitle: data.login_subtitle,
    supportEmail: data.support_email,
  };
  currentBranding = brandings[orgId];

  // Apply CSS custom properties for hex-level precision
  document.documentElement.style.setProperty('--tenant-primary', data.primary_color);
  document.documentElement.style.setProperty('--tenant-secondary', data.secondary_color);
}

export async function fetchAndApplyBranding(): Promise<ApiBranding | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/branding/current`);
    if (!res.ok) return null;
    const data: ApiBranding = await res.json();
    if (data.tenant_id) {
      applyApiBranding(data);
    }
    return data;
  } catch {
    return null;
  }
}
