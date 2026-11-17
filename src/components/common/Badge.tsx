import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?:
    | 'success'
    | 'danger'
    | 'warning'
    | 'info'
    | 'neutral'
    | 'primary'
    | 'purple';
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'sm',
  className = '',
}) => {
  const variantStyles = {
    success: 'bg-green-50 text-green-700 border-green-100',
    danger: 'bg-red-50 text-red-700 border-red-100',
    warning: 'bg-yellow-50 text-yellow-700 border-yellow-100',
    info: 'bg-blue-50 text-blue-700 border-blue-100',
    neutral: 'bg-gray-50 text-gray-700 border-gray-200',
    primary: 'bg-blue-50 text-blue-700 border-blue-100',
    purple: 'bg-purple-50 text-purple-700 border-purple-100',
  };

  const sizeStyles = {
    sm: 'text-[10px] px-2 py-0.5 font-bold uppercase tracking-wider',
    md: 'text-xs px-2.5 py-1 font-semibold uppercase tracking-wider',
  };

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full border whitespace-nowrap leading-none ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
    >
      {children}
    </span>
  );
};

export const StatusBadge: React.FC<{ status?: string; className?: string }> = ({ status = '', className }) => {
  if (!status) return null;
  const normalized = status.toLowerCase();

  switch (normalized) {
    case 'active':
    case 'present':
      return <Badge variant="success" className={className}>{status.toUpperCase()}</Badge>;
    case 'absent':
    case 'suspended':
    case 'withdrawn':
    case 'retired':
      return <Badge variant="danger" className={className}>{status.replace(/_/g, ' ').toUpperCase()}</Badge>;
    case 'late':
    case 'on_leave':
      return <Badge variant="warning" className={className}>{status.replace(/_/g, ' ').toUpperCase()}</Badge>;
    case 'excused':
    case 'transferred':
    case 'graduated':
      return <Badge variant="info" className={className}>{status.replace(/_/g, ' ').toUpperCase()}</Badge>;
    case 'super_admin':
      return <Badge variant="purple" className={className}>SUPER ADMIN</Badge>;
    case 'school_admin':
      return <Badge variant="primary" className={className}>ADMINISTRATOR</Badge>;
    case 'teacher':
      return <Badge variant="info" className={className}>TEACHER</Badge>;
    case 'staff':
      return <Badge variant="neutral" className={className}>STAFF</Badge>;
    default:
      return <Badge variant="neutral" className={className}>{status.replace(/_/g, ' ')}</Badge>;
  }
};
