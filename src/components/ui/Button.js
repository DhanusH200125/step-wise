'use client';

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon: Icon,
  onClick,
  children,
  className = '',
  type = 'button',
}) {
  const baseStyles = 'font-bold rounded-2xl transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2 active:scale-[0.97] uppercase tracking-widest text-[10px]';

  const variantStyles = {
    primary: 'bg-primary text-white hover:bg-primary-hover shadow-lg shadow-primary/20 border border-primary/10',
    secondary: 'bg-surface border border-border text-text hover:bg-surface2 hover:border-primary/20 shadow-sm',
    danger: 'bg-danger/10 text-danger border border-danger/20 hover:bg-danger hover:text-white shadow-sm',
    ghost: 'text-text-muted hover:bg-surface2 hover:text-text border border-transparent',
    success: 'bg-success text-white hover:opacity-90 shadow-lg shadow-success/20 border border-success/10',
  };

  const sizeStyles = {
    sm: 'px-4 py-2',
    md: 'px-6 py-3',
    lg: 'px-8 py-4 text-xs',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`
        ${baseStyles}
        ${variantStyles[variant] || variantStyles.primary}
        ${sizeStyles[size]}
        ${className}
      `}
    >
      {loading ? (
        <>
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          <span>Processing...</span>
        </>
      ) : (
        <>
          {Icon && <Icon className="w-4 h-4" />}
          {children}
        </>
      )}
    </button>
  );
}
