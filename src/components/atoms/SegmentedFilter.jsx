"use client";

export default function SegmentedFilter({ options, value, onChange, label, onPage = false }) {
  return (
    <div
      role="group"
      aria-label={label}
      className={`inline-flex max-w-full gap-0.5 overflow-x-auto rounded-sm p-[3px] ${onPage ? "bg-segment-track-page" : "bg-segment-track"}`}
    >
      {options.map((option) => {
        const active = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={`inline-flex h-[30px] cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-xs px-2.5 text-xs font-semibold transition-colors
              ${active ? "bg-card text-foreground shadow-segment" : "bg-transparent text-text-secondary hover:text-foreground"}`}
          >
            {option.label}
            {option.count != null && (
              <span className={`text-[10px] font-bold tabular-nums ${active ? "text-primary" : "text-text-disabled"}`}>
                {option.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
