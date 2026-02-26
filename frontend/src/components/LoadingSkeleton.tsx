const LoadingSkeleton = ({ rows = 3 }: { rows?: number }) => (
  <div className="space-y-4 animate-pulse">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="glass-card p-5 space-y-3">
        <div className="h-4 bg-muted rounded w-1/3" />
        <div className="h-3 bg-muted rounded w-2/3" />
        <div className="h-3 bg-muted rounded w-1/2" />
      </div>
    ))}
  </div>
);

export default LoadingSkeleton;
