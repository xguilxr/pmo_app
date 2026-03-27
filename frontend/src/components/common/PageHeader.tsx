import Breadcrumb from './Breadcrumb';

interface PageHeaderProps {
  breadcrumb: { label: string; href?: string }[];
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}

export default function PageHeader({ breadcrumb, title, subtitle, children }: PageHeaderProps) {
  return (
    <div className="space-y-3">
      <Breadcrumb items={breadcrumb} />
      <div className="bg-gradient-to-r from-blue-50 via-white to-blue-50 rounded-xl border border-blue-100/60 shadow-sm px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{title}</h2>
            {subtitle && (
              <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>
            )}
          </div>
          {children && (
            <div className="flex items-center gap-2">
              {children}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
