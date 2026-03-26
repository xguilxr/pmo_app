interface HealthBadgeProps {
  health: 'green' | 'yellow' | 'red';
}

const config = {
  green: { bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500', label: 'Sano' },
  yellow: { bg: 'bg-yellow-100', text: 'text-yellow-700', dot: 'bg-yellow-500', label: 'Atención' },
  red: { bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500', label: 'Crítico' },
};

export default function HealthBadge({ health }: HealthBadgeProps) {
  const c = config[health];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
}
