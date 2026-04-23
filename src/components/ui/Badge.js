'use client';

export default function Badge({ variant = 'status-pending', children, className = '' }) {
  const badgeStyles = {
    
    'domain-work': 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
    'domain-growth': 'bg-purple-500/10 text-purple-500 border-purple-500/20',
    'domain-health': 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    'domain-admin': 'bg-orange-500/10 text-orange-500 border-orange-500/20',

    
    'priority-high': 'bg-danger/10 text-danger border-danger/20',
    'priority-medium': 'bg-warning/10 text-warning border-warning/20',
    'priority-low': 'bg-text-muted/10 text-text-muted border-text-muted/20',

    
    'status-pending': 'bg-text-muted/10 text-text-muted border-text-muted/20',
    'status-scheduled': 'bg-primary/10 text-primary border-primary/20',
    'status-in_progress': 'bg-accent/10 text-accent border-accent/20',
    'status-completed': 'bg-success/10 text-success border-success/20',
    'status-cancelled': 'bg-danger/10 text-danger border-danger/20',
    'status-rescheduled': 'bg-purple-500/10 text-purple-500 border-purple-500/20',
    'status-overdue': 'bg-danger/20 text-danger border-danger/30',

    
    'energy-low': 'bg-success/10 text-success border-success/20',
    'energy-medium': 'bg-warning/10 text-warning border-warning/20',
    'energy-high': 'bg-danger/10 text-danger border-danger/20',
  };

  return (
    <span
      className={`
        inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border
        ${badgeStyles[variant] || badgeStyles['status-pending']}
        ${className}
      `}
    >
      {children}
    </span>
  );
}
