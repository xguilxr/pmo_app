interface PhaseBadgeProps {
  phase: string;
}

const phaseColors: Record<string, string> = {
  'Planificación': 'bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400',
  'Ejecución': 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400',
  'Soporte': 'bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-400',
  'Cerrado': 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400',
};

export default function PhaseBadge({ phase }: PhaseBadgeProps) {
  return (
    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${phaseColors[phase] || 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'}`}>
      {phase}
    </span>
  );
}
