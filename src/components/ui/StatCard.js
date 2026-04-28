'use client';

export default function StatCard({
  label,
  value,
  trend,
  color = 'primary',
  icon: Icon,
  description,
}) {
  const colorStyles = {
    primary: 'bg-primary/10 text-primary border-primary/20',
    success: 'bg-success/10 text-success border-success/20',
    warning: 'bg-warning/10 text-warning border-warning/20',
    danger: 'bg-danger/10 text-danger border-danger/20',
    accent: 'bg-accent/10 text-accent border-accent/20',
  };

  const trendContent = trend && (
    <div className={`flex items-center gap-1 text-xs font-bold ${
      trend.direction === 'up' ? 'text-success' : trend.direction === 'down' ? 'text-danger' : 'text-text-muted'
    }`}>
      <span className="text-[10px]">{trend.direction === 'up' ? '▲' : trend.direction === 'down' ? '▼' : '●'}</span>
      {trend.value}
    </div>
  );

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-all group flex items-center justify-between">
      <div className="space-y-1">
        <p className="text-[13px] font-semibold text-slate-500">{label}</p>
        <div className="flex items-baseline gap-2">
          <p className="text-2xl font-bold text-slate-900">{value}</p>
          {trendContent}
        </div>
        {description && <p className="text-[11px] text-slate-400 font-medium">{description}</p>}
      </div>

      {Icon && (
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105 ${colorStyles[color].split(' ')[0]} ${colorStyles[color].split(' ')[1]}`}>
          <Icon className="w-6 h-6" />
        </div>
      )}
    </div>
  );
}
