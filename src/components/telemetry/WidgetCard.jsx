"use client";

import { useRef } from "react";
import { format, parseISO, formatDistanceToNow } from "date-fns";
import { Calendar, ChevronDown, Clock, RotateCw } from "lucide-react";

export function LiveBadge() {
  return (
    <span className="inline-flex h-[22px] items-center gap-1.5 rounded-xs bg-success-soft px-2 text-[11px] font-semibold text-success-soft-foreground">
      <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden="true" />
      Live
    </span>
  );
}

export function RefreshButton({ onClick, loading }) {
  return (
    <button
      type="button"
      aria-label="Refresh"
      title="Refresh"
      onClick={onClick}
      className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-xs border border-border text-muted-foreground hover:bg-surface-subtle hover:text-foreground"
    >
      <RotateCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} aria-hidden="true" />
    </button>
  );
}

export function DateButton({ day, onChange }) {
  const inputRef = useRef(null);
  const today = format(new Date(), "yyyy-MM-dd");

  const open = () => {
    const el = inputRef.current;
    if (!el) return;
    try {
      el.showPicker();
    } catch {
      el.focus();
      el.click();
    }
  };

  return (
    <span className="relative">
      <button
        type="button"
        aria-label={`Change date, currently ${format(parseISO(day), "MMM d")}`}
        onClick={open}
        className="inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-xs border border-border px-2 text-xs font-semibold text-text-button-secondary hover:bg-surface-subtle"
      >
        <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
        <span className="tabular-nums">{format(parseISO(day), "MMM d")}</span>
        <ChevronDown className="h-3 w-3" aria-hidden="true" />
      </button>
      <input
        ref={inputRef}
        type="date"
        value={day}
        max={today}
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => event.target.value && onChange(event.target.value)}
        className="pointer-events-none absolute left-0 top-full h-0 w-0 opacity-0"
      />
    </span>
  );
}

export default function WidgetCard({ title, unit, height, controls, updatedAt, showFooter = false, danger = false, className = "", children }) {
  return (
    <section
      style={{ height }}
      className={`flex flex-col overflow-hidden rounded-lg border bg-card ${danger ? "border-danger-border" : "border-border"} ${className}`}
    >
      <div className="flex h-[52px] shrink-0 items-center justify-between gap-2 border-b border-border-faint px-4">
        <h3 className="truncate text-sm font-bold text-foreground">
          {title}
          {unit && <span className="font-medium text-muted-foreground"> ({unit})</span>}
        </h3>
        {controls && <div className="flex shrink-0 items-center gap-1.5">{controls}</div>}
      </div>
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      {showFooter && (
        <div className="flex shrink-0 items-center gap-1.5 border-t border-border-faint px-4 py-2.5 text-[11px] text-muted-foreground">
          <Clock className="h-3 w-3" aria-hidden="true" />
          {updatedAt ? `Updated ${formatDistanceToNow(new Date(updatedAt), { addSuffix: true })}` : "No data yet"}
        </div>
      )}
    </section>
  );
}

export function WidgetSkeleton() {
  return (
    <div className="flex flex-1 animate-pulse flex-col gap-3 p-4" role="status" aria-label="Loading" aria-busy="true">
      <div className="h-3 w-1/3 rounded bg-border-subtle" />
      <div className="flex-1 rounded-md bg-border-subtle" />
    </div>
  );
}

export function WidgetEmpty({ children = "No data available" }) {
  return <div className="flex flex-1 items-center justify-center px-4 text-center text-[13px] text-text-disabled">{children}</div>;
}
