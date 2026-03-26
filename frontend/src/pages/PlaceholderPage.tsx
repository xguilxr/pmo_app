import { useLocation } from 'react-router-dom';
import { Construction } from 'lucide-react';

export default function PlaceholderPage() {
  const location = useLocation();
  const pageName = location.pathname.split('/').filter(Boolean).join(' > ') || 'Página';

  return (
    <div className="flex flex-col items-center justify-center py-24 text-gray-400">
      <Construction className="w-16 h-16 mb-4" />
      <h2 className="text-lg font-semibold text-gray-600 capitalize">{pageName}</h2>
      <p className="text-sm mt-1">Módulo en desarrollo</p>
    </div>
  );
}
