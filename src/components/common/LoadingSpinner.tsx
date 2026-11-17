import React from 'react';
import { LucideIcon, Inbox } from 'lucide-react';

export const LoadingSpinner: React.FC<{ message?: string; size?: 'sm' | 'md' | 'lg' }> = ({
  message = 'Loading data...',
  size = 'md',
}) => {
  const sizeMap = {
    sm: 'w-4 h-4 border-2',
    md: 'w-7 h-7 border-2',
    lg: 'w-10 h-10 border-3',
  };

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div
        className={`${sizeMap[size]} border-blue-600 border-t-transparent rounded-full animate-spin`}
      />
      {message && <p className="mt-3 text-xs sm:text-sm font-medium text-slate-500">{message}</p>}
    </div>
  );
};

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = Inbox,
  title,
  description,
  action,
}) => {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-6 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 my-4">
      <div className="p-3.5 bg-white rounded-2xl shadow-xs border border-slate-200 text-slate-400 mb-3">
        <Icon className="w-8 h-8" />
      </div>
      <h4 className="text-base font-semibold text-slate-800">{title}</h4>
      {description && <p className="text-xs sm:text-sm text-slate-500 max-w-sm mt-1 mb-4">{description}</p>}
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="mt-2 px-4 py-2 text-xs sm:text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition"
        >
          {action.label}
        </button>
      )}
    </div>
  );
};
