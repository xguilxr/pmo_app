import { type ReactNode } from 'react';
import { Link } from 'react-router-dom';

interface KpiCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  to: string;
  color: string;
}

export default function KpiCard({ title, value, icon, to, color }: KpiCardProps) {
  return (
    <Link
      to={to}
      className="bg-surface rounded-2xl border border-border p-5 hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/20 transition-all duration-300 hover:border-accent/30 group"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[12px] font-medium text-text-tertiary uppercase tracking-wider mb-1.5">{title}</p>
          <p className="text-2xl font-bold text-text-primary">{value}</p>
        </div>
        <div className={`p-2.5 rounded-xl ${color} transition-transform duration-300 group-hover:scale-110`}>
          {icon}
        </div>
      </div>
    </Link>
  );
}
