import { Search } from "lucide-react";

export default function SearchInput({ value, onChange, placeholder, label, className = "" }) {
  return (
    <div className={`relative w-full sm:w-[280px] ${className}`}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-disabled" aria-hidden="true" />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={label ?? placeholder}
        className="h-9 w-full rounded-sm border border-border-strong bg-card pl-9 pr-3 text-xs text-foreground placeholder:text-text-disabled
          focus-visible:border-primary focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_rgba(37,99,235,0.15)]"
      />
    </div>
  );
}
