interface ProgressBarProps {
  value: number;
  planned?: number;
}

export default function ProgressBar({ value, planned }: ProgressBarProps) {
  const barColor = planned && value < planned - 10 ? 'bg-red-500' : value >= 100 ? 'bg-emerald-500' : 'bg-accent';

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-surface-tertiary rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${Math.min(value, 100)}%` }} />
      </div>
      <span className="text-[11px] font-semibold text-text-secondary w-10 text-right">{value}%</span>
    </div>
  );
}
