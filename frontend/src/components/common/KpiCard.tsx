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
      className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-all hover:border-gray-300 group"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
        <div className={`p-2.5 rounded-lg ${color} transition-transform group-hover:scale-110`}>
          {icon}
        </div>
      </div>
    </Link>
  );
}
