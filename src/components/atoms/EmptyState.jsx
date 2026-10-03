export default function EmptyState({ icon: Icon, title, description, action, tone = "neutral", standalone = false, className = "" }) {
  const circle =
    tone === "danger" ? "bg-danger-soft text-danger" : tone === "success" ? "bg-success-soft text-success" : "bg-neutral-soft text-text-secondary";
  return (
    <div className={`flex flex-col items-center justify-center gap-2 text-center ${standalone ? "px-6 py-10" : "px-5 py-12"} ${className}`}>
      {Icon && (
        <span className={`flex h-11 w-11 items-center justify-center rounded-full ${circle}`}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
      )}
      <p className="text-sm font-bold text-foreground">{title}</p>
      {description && <p className="max-w-[300px] text-[13px] text-muted-foreground">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
