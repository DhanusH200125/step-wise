'use client';

export default function Card({
  children,
  className = '',
  hoverable = false,
  padding = 'md',
  variant = 'surface', 
}) {
  const paddingStyles = {
    none: 'p-0',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  const variants = {
    surface: 'bg-surface border-border shadow-sm',
    glass: 'glass-panel',
    'glass-elevated': 'glass-panel-elevated',
  };

  return (
    <div
      className={`
        rounded-2xl border transition-all duration-300
        ${variants[variant]}
        ${hoverable ? 'hover:shadow-lg hover:scale-[1.01] hover:border-primary/20 cursor-pointer' : ''}
        ${paddingStyles[padding]}
        ${className}
      `}
    >
      {children}
    </div>
  );
}
