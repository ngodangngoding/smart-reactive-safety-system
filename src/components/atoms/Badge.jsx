const variants = {
  success: "bg-success-soft text-success-soft-foreground",
  warning: "bg-warning-soft text-warning-soft-foreground",
  danger: "bg-danger-soft text-danger-soft-foreground",
  primary: "bg-primary-soft text-primary-soft-foreground",
  gray: "bg-neutral-soft text-neutral-soft-foreground",
};

const dotColors = {
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  primary: "bg-primary",
  gray: "bg-neutral",
};

export default function Badge({ variant = "gray", withDot = false, className = "", children }) {
  return (
    <span
      className={`inline-flex h-[22px] items-center gap-1.5 whitespace-nowrap rounded-xs px-2 text-[11px] font-semibold ${variants[variant]} ${className}`}
    >
      {withDot && <span className={`h-1.5 w-1.5 rounded-full ${dotColors[variant]}`} aria-hidden="true" />}
      {children}
    </span>
  );
}
