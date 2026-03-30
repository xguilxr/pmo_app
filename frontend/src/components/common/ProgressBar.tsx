interface ProgressBarProps {
  value: number;
  planned?: number;
}

export default function ProgressBar({ value, planned }: ProgressBarProps) {
  const barClass = planned && value < planned - 10
    ? 'bg-gradient-to-r from-red-500 to-red-400'
    : value >= 100
    ? 'bg-gradient-to-r from-emerald-500 to-emerald-400'
    : 'bg-gradient-to-r from-accent to-indigo-400';

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-surface-tertiary rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${barClass}`} style={{ width: `${Math.min(value, 100)}%` }} />
      </div>
      <span className="text-[11px] font-normal text-text-tertiary w-10 text-right">{value}%</span>
    </div>
  );
}
