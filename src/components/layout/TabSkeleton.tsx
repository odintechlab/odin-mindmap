export function TabSkeleton() {
  return (
    <div className="space-y-6 p-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="glass-strong h-28 rounded-2xl border border-[var(--border)] p-4 shadow-surface"
          >
            <div className="loading-shimmer h-3 w-20 rounded" />
            <div className="loading-shimmer mt-4 h-8 w-14 rounded" />
          </div>
        ))}
      </div>
      <div className="glass-strong h-72 rounded-2xl border border-[var(--border)] p-5 shadow-surface">
        <div className="loading-shimmer h-4 w-32 rounded" />
        <div className="mt-6 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="loading-shimmer h-12 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
