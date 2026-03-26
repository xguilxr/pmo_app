interface ProgressBarProps {
  value: number;
  planned?: number;
}

export default function ProgressBar({ value, planned }: ProgressBarProps) {
  const barColor = planned && value < planned - 10 ? 'bg-red-500' : value >= 100 ? 'bg-green-500' : 'bg-blue-500';

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${Math.min(value, 100)}%` }} />
      </div>
      <span className="text-xs font-medium text-gray-600 w-10 text-right">{value}%</span>
    </div>
  );
}
