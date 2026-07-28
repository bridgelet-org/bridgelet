type SkeletonLoaderProps = {
  /** Number of skeleton rows to render */
  rows?: number;
  /** Show a wider header block above the rows */
  showHeader?: boolean;
};

export function SkeletonLoader({ rows = 3, showHeader = false }: SkeletonLoaderProps) {
  return (
    <div role="status" aria-label="Loading…" className="animate-pulse space-y-3">
      {showHeader && <div className="h-5 w-2/5 rounded bg-slate-200" />}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="space-y-2">
          <div className="h-3 rounded bg-slate-200" style={{ width: `${85 - i * 10}%` }} />
        </div>
      ))}
      <span className="sr-only">Loading content, please wait.</span>
    </div>
  );
}
