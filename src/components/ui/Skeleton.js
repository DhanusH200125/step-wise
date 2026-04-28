'use client';

export default function Skeleton({
  width = '100%',
  height = '1rem',
  rounded = true,
  count = 1,
  className = '',
}) {
  const widthStyle = typeof width === 'number' ? `${width}px` : width;
  const heightStyle = typeof height === 'number' ? `${height}px` : height;

  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          style={{
            width: widthStyle,
            height: heightStyle,
          }}
          className={`
            bg-neutral-200 animate-pulse
            ${rounded ? 'rounded' : ''}
          `}
        />
      ))}
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="space-y-3 p-4 border border-neutral-200 rounded-lg">
      <Skeleton height={20} className="w-3/4" />
      <Skeleton height={16} className="w-full" count={2} />
      <div className="flex gap-2 pt-2">
        <Skeleton width={80} height={20} rounded={true} />
        <Skeleton width={60} height={20} rounded={true} />
      </div>
    </div>
  );
}

export function SkeletonStatCard() {
  return (
    <div className="space-y-2 p-4 border border-neutral-200 rounded-lg">
      <Skeleton height={16} className="w-1/2" />
      <Skeleton height={28} className="w-3/4" />
      <Skeleton height={12} className="w-1/3" />
    </div>
  );
}

export function SkeletonTable() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex gap-4">
          <Skeleton width={40} height={20} />
          <Skeleton height={20} className="flex-1" />
          <Skeleton width={80} height={20} />
        </div>
      ))}
    </div>
  );
}

export function SkeletonChart() {
  return (
    <div className="space-y-4 p-4 border border-neutral-200 rounded-lg">
      <Skeleton height={200} />
      <Skeleton height={16} className="w-1/2" />
    </div>
  );
}
