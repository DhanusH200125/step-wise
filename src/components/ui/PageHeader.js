'use client';

export default function PageHeader({
  title,
  subtitle,
  action,
  icon: Icon,
  category,
}) {
  return (
    <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
      <div className="space-y-1">
        {(category || Icon) && (
          <div className="flex items-center gap-2 mb-2 text-primary">
            {Icon && (
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Icon className="w-5 h-5 fill-current" />
              </div>
            )}
            {category && (
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">{category}</span>
            )}
          </div>
        )}
        <h1 className="text-4xl font-black text-text tracking-tight animate-in slide-in-from-left duration-500">
          {title}
        </h1>
        {subtitle && (
          <p className="text-text-muted font-medium text-lg leading-relaxed max-w-2xl animate-in slide-in-from-left duration-700">
            {subtitle}
          </p>
        )}
      </div>
      {action && (
        <div className="animate-in slide-in-from-right duration-500">
          {action}
        </div>
      )}
    </div>
  );
}
