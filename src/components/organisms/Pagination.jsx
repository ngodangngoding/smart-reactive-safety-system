"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Button from "@/components/atoms/Button.jsx";

export default function Pagination({ pagination, onPageChange, noun = "items" }) {
  if (!pagination || pagination.total === 0) return null;
  const { page, pageSize, total, totalPages } = pagination;
  const first = (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);

  return (
    <nav aria-label="Pagination" className="flex flex-wrap items-center justify-between gap-3 border-t border-border-subtle px-4 py-3 sm:px-5">
      <p className="text-xs tabular-nums text-muted-foreground">
        {first}-{last} of {total} {noun}
      </p>
      <div className="flex items-center gap-2">
        <Button variant="secondary" onClick={() => onPageChange(page - 1)} disabled={page <= 1} aria-label="Previous page">
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        </Button>
        <span className="text-xs tabular-nums text-muted-foreground">
          Page {page} of {totalPages}
        </span>
        <Button variant="secondary" onClick={() => onPageChange(page + 1)} disabled={page >= totalPages} aria-label="Next page">
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </nav>
  );
}
