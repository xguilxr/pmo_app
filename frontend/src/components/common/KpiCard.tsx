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
      className="bg-surface rounded-2xl border border-border p-5 card-glow transition-all duration-300 group relative overflow-hidden"
    >
      {/* Subtle gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-accent/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-[11px] font-normal text-text-tertiary uppercase tracking-widest mb-2">{title}</p>
          <p className="text-2xl font-medium text-text-primary tracking-tight">{value}</p>
        </div>
        <div className={`p-2.5 rounded-xl ${color} transition-transform duration-300 group-hover:scale-110`}>
          {icon}
        </div>
      </div>
    </Link>
  );
}
