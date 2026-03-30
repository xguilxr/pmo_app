interface HealthBadgeProps {
  health: 'green' | 'yellow' | 'red';
}

const config = {
  green: { cls: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20', dot: 'bg-emerald-500', label: 'Sano' },
  yellow: { cls: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20', dot: 'bg-amber-500', label: 'Atencion' },
  red: { cls: 'bg-red-500/10 text-red-500 dark:text-red-400 border-red-500/20', dot: 'bg-red-500', label: 'Critico' },
};

export default function HealthBadge({ health }: HealthBadgeProps) {
  const c = config[health];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[11px] font-normal border ${c.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
}
