import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  iconBgColor?: string;
  iconColor?: string;
  trend?: {
    value: string;
    isPositive?: boolean;
  };
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  iconBgColor = 'bg-blue-50',
  iconColor = 'text-blue-600',
  trend,
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      className={`bg-white p-6 rounded-xl border border-gray-100 shadow-xs hover:border-gray-200 transition flex flex-col justify-between ${
        onClick ? 'cursor-pointer' : ''
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <span className="text-xs font-medium uppercase tracking-wider text-gray-500">{title}</span>
          <div className="text-3xl font-bold text-gray-900 mt-2 tracking-tight">{value}</div>
        </div>
        <div className={`p-2.5 rounded-lg border border-gray-100 ${iconBgColor} ${iconColor}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>

      {(subtitle || trend) && (
        <div className="mt-4 pt-3 border-t border-gray-50 flex items-center justify-between text-xs text-gray-500">
          {subtitle && <span>{subtitle}</span>}
          {trend && (
            <span
              className={`font-semibold ml-auto ${
                trend.isPositive ? 'text-green-700 bg-green-50 px-2 py-0.5 rounded' : 'text-red-700 bg-red-50 px-2 py-0.5 rounded'
              }`}
            >
              {trend.value}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
