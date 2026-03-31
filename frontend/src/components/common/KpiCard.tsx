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
      className="liquid-glass-border rounded-2xl p-5 card-glow group relative overflow-hidden"
    >
      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-[11px] font-medium text-text-tertiary uppercase tracking-widest mb-2">{title}</p>
          <p className="text-3xl font-semibold text-text-primary tracking-tight leading-none">{value}</p>
        </div>
        <div className={`p-2.5 rounded-xl ${color} transition-transform group-hover:scale-110`}>
          {icon}
        </div>
      </div>
    </Link>
  );
}
