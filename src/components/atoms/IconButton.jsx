import Link from "next/link";

export default function IconButton({ icon: Icon, label, variant = "plain", danger = false, className = "", href, ...props }) {
  const Tag = href ? Link : "button";
  return (
    <Tag
      {...(href ? { href } : { type: "button" })}
      aria-label={label}
      title={label}
      className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-sm text-muted-foreground cursor-pointer transition-colors
        disabled:cursor-not-allowed disabled:text-[#d0d5dd]
        ${variant === "bordered" ? "border border-border bg-card" : "bg-transparent"}
        ${danger ? "hover:bg-danger-soft hover:text-danger disabled:hover:bg-transparent disabled:hover:text-[#d0d5dd]" : "hover:bg-surface-subtle hover:text-foreground"}
        ${className}`}
      {...props}
    >
      <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden="true" />
    </Tag>
  );
}
