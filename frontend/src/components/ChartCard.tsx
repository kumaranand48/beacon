import type { ReactNode } from 'react';

interface ChartCardProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
}

export default function ChartCard({
  title,
  subtitle,
  children,
  className = '',
  action,
}: ChartCardProps) {
  return (
    <div
      className={`bg-surface-card rounded-card shadow-card border border-gray-100/60 p-6 ${className}`}
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-text-primary font-bold text-lg">{title}</h3>
          {subtitle && (
            <p className="text-text-secondary text-sm mt-0.5">{subtitle}</p>
          )}
        </div>
        {action && <div>{action}</div>}
      </div>
      {children}
    </div>
  );
}
