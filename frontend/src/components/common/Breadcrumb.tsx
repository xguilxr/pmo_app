import { useNavigate } from 'react-router-dom';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';

interface BreadcrumbProps {
  items: { label: string; href?: string }[];
}

export default function Breadcrumb({ items }: BreadcrumbProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-2 text-[13px]">
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 text-text-tertiary hover:text-accent transition-colors font-medium"
      >
        <ArrowLeft className="w-4 h-4" />
        {t('common.back')}
      </button>
      <span className="text-border mx-1">|</span>
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <span key={index} className="flex items-center gap-2">
            {index > 0 && <span className="text-text-tertiary">/</span>}
            {isLast || !item.href ? (
              <span className="font-semibold text-text-primary">{item.label}</span>
            ) : (
              <NavLink
                to={item.href}
                className="text-text-tertiary hover:text-accent transition-colors"
              >
                {item.label}
              </NavLink>
            )}
          </span>
        );
      })}
    </div>
  );
}
