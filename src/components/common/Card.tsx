import React from 'react';

export interface CardProps {
  title?: React.ReactNode;
  subtitle?: string;
  actions?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  headerClassName?: string;
  bodyClassName?: string;
}

export const Card: React.FC<CardProps> = ({
  title,
  subtitle,
  actions,
  footer,
  children,
  className = '',
  headerClassName = '',
  bodyClassName = '',
}) => {
  return (
    <div className={`bg-white rounded-xl border border-gray-100 shadow-xs flex flex-col ${className}`}>
      {(title || subtitle || actions) && (
        <div className={`p-5 sm:p-6 border-b border-gray-50 flex items-center justify-between gap-4 ${headerClassName}`}>
          <div>
            {typeof title === 'string' ? (
              <h3 className="font-bold text-gray-800 text-base">{title}</h3>
            ) : (
              title
            )}
            {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
          </div>
          {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
        </div>
      )}

      <div className={`p-5 sm:p-6 flex-1 ${bodyClassName}`}>{children}</div>

      {footer && (
        <div className="p-4 sm:p-5 bg-gray-50 border-t border-gray-100 rounded-b-xl flex items-center justify-between text-xs text-gray-500">
          {footer}
        </div>
      )}
    </div>
  );
};
