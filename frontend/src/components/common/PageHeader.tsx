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
      <div className="liquid-glass-border rounded-2xl px-6 py-5 relative overflow-hidden">
        {/* Subtle gradient accent line at top */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-accent/30 to-transparent" />
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-text-primary tracking-tight">{title}</h2>
            {subtitle && (
              <p className="text-[13px] text-text-tertiary mt-0.5 font-light">{subtitle}</p>
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
