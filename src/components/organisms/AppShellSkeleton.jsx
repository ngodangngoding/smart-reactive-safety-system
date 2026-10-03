export default function AppShellSkeleton() {
  return (
    <div className="min-h-screen bg-background" role="status" aria-label="Loading" aria-busy="true">
      <div className="fixed inset-y-0 left-0 hidden w-60 flex-col gap-5 border-r border-border bg-card px-3 py-4 md:flex">
        <div className="flex animate-pulse items-center gap-2.5 border-b border-border-subtle px-2 pb-4 pt-1">
          <div className="h-8 w-8 rounded-sm bg-border-subtle" />
          <div className="flex-1 space-y-2">
            <div className="h-2.5 w-28 rounded bg-border-subtle" />
            <div className="h-2 w-16 rounded bg-border-subtle" />
          </div>
        </div>
        <div className="animate-pulse space-y-2.5 px-2.5">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-4 rounded bg-border-subtle" />
          ))}
        </div>
      </div>

      <div className="flex min-h-screen min-w-0 flex-col md:pl-60">
        <div className="flex h-16 shrink-0 animate-pulse items-center justify-between border-b border-border bg-card px-3 sm:px-6">
          <div className="h-9 w-9 rounded-sm bg-border-subtle" />
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="h-9 w-9 rounded-sm bg-border-subtle" />
            <div className="h-[34px] w-[34px] rounded-full bg-border-subtle" />
            <div className="hidden h-9 w-28 rounded bg-border-subtle sm:block" />
          </div>
        </div>

        <div className="flex animate-pulse flex-col gap-5 p-4 sm:p-6">
          <div className="space-y-2">
            <div className="h-7 w-56 max-w-full rounded bg-border-subtle" />
            <div className="h-3 w-72 max-w-full rounded bg-border-subtle" />
          </div>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-24 rounded-lg border border-border bg-card" />
            ))}
          </div>
          <div className="h-[360px] rounded-lg border border-border bg-card" />
        </div>
      </div>
    </div>
  );
}
