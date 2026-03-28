interface HealthBadgeProps {
  health: 'green' | 'yellow' | 'red';
}

const config = {
  green: { bg: 'bg-emerald-100 dark:bg-emerald-950/50', text: 'text-emerald-700 dark:text-emerald-400', dot: 'bg-emerald-500', label: 'Sano' },
  yellow: { bg: 'bg-amber-100 dark:bg-amber-950/50', text: 'text-amber-700 dark:text-amber-400', dot: 'bg-amber-500', label: 'Atención' },
  red: { bg: 'bg-red-100 dark:bg-red-950/50', text: 'text-red-700 dark:text-red-400', dot: 'bg-red-500', label: 'Crítico' },
};

export default function HealthBadge({ health }: HealthBadgeProps) {
  const c = config[health];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
}
