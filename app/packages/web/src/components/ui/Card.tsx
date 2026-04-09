import { HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: 'sm' | 'md' | 'lg';
  hover?: boolean;
}

const paddingClasses = {
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

export default function Card({
  padding = 'md',
  hover = false,
  className = '',
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={`
        bg-white rounded-xl border border-border
        ${paddingClasses[padding]}
        ${hover ? 'transition-all duration-150 hover:border-terracotta/30 hover:translate-y-[-1px]' : ''}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
}
