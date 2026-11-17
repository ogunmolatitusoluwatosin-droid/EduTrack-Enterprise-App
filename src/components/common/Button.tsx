import React, { ButtonHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  className = '',
  disabled,
  ...props
}) => {
  const variantStyles: Record<ButtonVariant, string> = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs border border-transparent',
    secondary: 'bg-gray-100 hover:bg-gray-200 text-gray-800 border border-transparent',
    outline: 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 shadow-xs',
    danger: 'bg-red-600 hover:bg-red-700 text-white shadow-xs border border-transparent',
    ghost: 'bg-transparent hover:bg-gray-100 text-gray-600 hover:text-gray-900 border border-transparent',
  };

  const sizeStyles: Record<ButtonSize, string> = {
    xs: 'text-xs px-2.5 py-1 rounded gap-1.5 font-medium',
    sm: 'text-xs px-3 py-1.5 rounded-md gap-1.5 font-medium',
    md: 'text-sm px-4 py-2 rounded-md gap-2 font-medium',
    lg: 'text-base px-5 py-2.5 rounded-lg gap-2.5 font-medium',
  };

  return (
    <button
      disabled={disabled || isLoading}
      className={`inline-flex items-center justify-center transition-colors cursor-pointer select-none disabled:opacity-50 disabled:cursor-not-allowed ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
      ) : (
        leftIcon && <span className="shrink-0">{leftIcon}</span>
      )}
      {children}
      {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
    </button>
  );
};
