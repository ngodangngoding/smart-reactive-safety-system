export default function WorkerTableSkeleton({ rows = 5 }) {
  return (
    <div className="animate-pulse divide-y divide-border-subtle" role="status" aria-label="Loading worker monitoring data" aria-busy="true">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex items-center gap-3 px-4 py-3.5 sm:gap-4 sm:px-5">
          <div className="h-8 w-8 shrink-0 rounded-full bg-border-subtle" />
          <div className="flex-1 space-y-2">
            <div className="h-2.5 w-[110px] rounded bg-border-subtle" />
            <div className="h-2 w-14 rounded bg-border-subtle" />
          </div>
          <div className="h-5 w-[72px] rounded-xs bg-border-subtle" />
          <div className="hidden h-2.5 w-16 rounded bg-border-subtle sm:block" />
          <div className="hidden h-2.5 w-24 rounded bg-border-subtle md:block" />
        </div>
      ))}
    </div>
  );
}
