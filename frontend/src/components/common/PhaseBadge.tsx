interface PhaseBadgeProps {
  phase: string;
}

const phaseColors: Record<string, string> = {
  'Planificación': 'bg-blue-100 text-blue-700',
  'Ejecución': 'bg-amber-100 text-amber-700',
  'Soporte': 'bg-purple-100 text-purple-700',
  'Cerrado': 'bg-gray-100 text-gray-600',
};

export default function PhaseBadge({ phase }: PhaseBadgeProps) {
  return (
    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${phaseColors[phase] || 'bg-gray-100 text-gray-600'}`}>
      {phase}
    </span>
  );
}
