const ACCENTS = {
  primary: "bg-primary-soft text-primary",
  success: "bg-success-soft text-success",
  danger: "bg-danger-soft text-danger",
  warning: "bg-warning-soft text-warning",
  neutral: "bg-neutral-soft text-text-secondary",
  purple: "bg-accent-purple-soft text-accent-purple",
};

export default function StatCard({ icon: Icon, label, value, accent = "primary", note, noteClassName = "text-muted-foreground", emphasize = false, loading = false }) {
  return (
    <div
      aria-busy={loading || undefined}
      className={`flex flex-col items-start gap-2.5 rounded-lg border bg-card px-4 py-4 sm:flex-row sm:items-center sm:gap-3.5 sm:px-5 sm:py-[18px] ${emphasize ? "border-danger-border" : "border-border"}`}
    >
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-md ${ACCENTS[accent]}`}>
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        {loading ? (
          <span className="block h-8 w-12 animate-pulse rounded bg-border-subtle" role="status" aria-label="Loading" />
        ) : (
          <p className={`text-2xl font-bold leading-[1.1] tabular-nums sm:text-3xl ${emphasize ? "text-danger-soft-foreground" : "text-foreground"}`}>
            {value}
          </p>
        )}
      </div>
      {note && !loading && <p className={`sm:ml-auto sm:self-start text-xs font-medium ${noteClassName}`}>{note}</p>}
    </div>
  );
}
