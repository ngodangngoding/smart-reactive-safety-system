export default function DetailPageSkeleton({ fields = 3, stats = false, className = "max-w-lg" }) {
  return (
    <div className={`${className} animate-pulse space-y-5`} role="status" aria-label="Loading" aria-busy="true">
      <div className="flex items-center justify-between gap-3">
        <div className="h-7 w-52 max-w-[65%] rounded bg-border-subtle" />
        <div className="h-9 w-9 shrink-0 rounded-sm bg-border-subtle" />
      </div>

      {stats && (
        <div className="grid grid-cols-2 gap-4 rounded-lg border border-border bg-card p-4 sm:grid-cols-4 sm:p-5">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="space-y-2">
              <div className="h-2.5 w-16 rounded bg-border-subtle" />
              <div className="h-4 w-24 max-w-full rounded bg-border-subtle" />
            </div>
          ))}
        </div>
      )}

      <div className="space-y-4 rounded-lg border border-border bg-card p-4 sm:p-6">
        {Array.from({ length: fields }).map((_, index) => (
          <div key={index} className="space-y-2">
            <div className="h-2.5 w-24 rounded bg-border-subtle" />
            <div className="h-9 w-full rounded-sm bg-border-subtle" />
          </div>
        ))}
        <div className="flex justify-end gap-2.5">
          <div className="h-9 w-20 rounded-sm bg-border-subtle" />
          <div className="h-9 w-28 rounded-sm bg-border-subtle" />
        </div>
      </div>
    </div>
  );
}
