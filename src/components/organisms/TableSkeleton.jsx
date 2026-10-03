export default function TableSkeleton({ rows = 5, columns = 4 }) {
  return (
    <div className="animate-pulse divide-y divide-border-subtle" role="status" aria-label="Loading" aria-busy="true">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex items-center gap-4 px-4 py-4 sm:gap-6 sm:px-5">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <div
              key={colIndex}
              className={`h-2.5 flex-1 rounded bg-border-subtle ${colIndex >= 5 ? "hidden lg:block" : colIndex >= 3 ? "hidden sm:block" : ""}`}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
