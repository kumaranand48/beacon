import { type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface KpiCardProps {
  icon: ReactNode;
  label: string;
  value: string;
  change: number;
  color?: 'purple' | 'blue' | 'emerald' | 'amber';
  href?: string;
}

const colorMap = {
  purple: {
    iconBg: 'bg-gradient-to-r from-[#D946A8] to-[#7B2FF7]',
    shadow: 'shadow-kpi-purple',
    accent: 'bg-primary-50',
  },
  blue: {
    iconBg: 'bg-gradient-to-br from-blue-400 to-blue-600',
    shadow: 'shadow-kpi-blue',
    accent: 'bg-blue-50',
  },
  emerald: {
    iconBg: 'bg-gradient-to-br from-emerald-400 to-emerald-600',
    shadow: 'shadow-kpi-emerald',
    accent: 'bg-emerald-50',
  },
  amber: {
    iconBg: 'bg-gradient-to-br from-amber-400 to-amber-500',
    shadow: 'shadow-kpi-amber',
    accent: 'bg-amber-50',
  },
};

export default function KpiCard({
  icon,
  label,
  value,
  change,
  color = 'purple',
  href,
}: KpiCardProps) {
  const navigate = useNavigate();
  const isPositive = change >= 0;
  const scheme = colorMap[color];

  return (
    <div
      className={`bg-surface-card rounded-card shadow-card hover:shadow-card-hover transition-all duration-200 p-6 flex items-start gap-4 border border-gray-100/60${href ? ' cursor-pointer' : ''}`}
      onClick={href ? () => navigate(href) : undefined}
    >
      <div
        className={`${scheme.iconBg} w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${scheme.shadow}`}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-text-secondary text-sm font-medium mb-1">{label}</p>
        <p className="text-text-primary text-2xl font-bold leading-tight">
          {value}
        </p>
        <div className="flex items-center gap-1.5 mt-2">
          <div
            className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-bold ${
              isPositive
                ? 'bg-emerald-50 text-emerald-600'
                : 'bg-red-50 text-red-500'
            }`}
          >
            {isPositive ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            {isPositive ? '+' : ''}
            {change.toFixed(1)}%
          </div>
          <span className="text-text-muted text-xs">vs last month</span>
        </div>
      </div>
    </div>
  );
}
