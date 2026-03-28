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
      <div className="bg-surface rounded-2xl border border-border px-6 py-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-text-primary tracking-tight">{title}</h2>
            {subtitle && (
              <p className="text-[13px] text-text-secondary mt-0.5">{subtitle}</p>
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
