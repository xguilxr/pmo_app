interface PhaseBadgeProps {
  phase: string;
}

const phaseColors: Record<string, string> = {
  'Planificacion': 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
  'Planificación': 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
  'Ejecucion': 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  'Ejecución': 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  'Soporte': 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20',
  'Cerrado': 'bg-slate-500/10 text-slate-500 dark:text-slate-400 border-slate-500/20',
};

export default function PhaseBadge({ phase }: PhaseBadgeProps) {
  return (
    <span className={`inline-flex px-2.5 py-0.5 rounded-lg text-[11px] font-normal border ${phaseColors[phase] || 'bg-slate-500/10 text-slate-500 border-slate-500/20'}`}>
      {phase}
    </span>
  );
}
