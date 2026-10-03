"use client";

import { useEffect, useRef, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ShieldAlert } from "lucide-react";
import Button from "@/components/atoms/Button.jsx";

export default function ResolveIncidentModal({ incident, worker, loading, onConfirm, onClose }) {
  const cancelRef = useRef(null);
  const [note, setNote] = useState("");

  useEffect(() => {
    cancelRef.current?.focus();
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  if (!incident) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 px-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="resolve-incident-title"
        className="w-full max-w-md max-h-[90dvh] overflow-y-auto rounded-lg bg-card p-5 shadow-overlay sm:p-6"
      >
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-danger-soft">
            <ShieldAlert className="h-5 w-5 text-danger" aria-hidden="true" />
          </span>
          <div>
            <h2 id="resolve-incident-title" className="text-base font-semibold text-foreground">
              Resolve this emergency?
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {worker?.name ?? "This worker"} ({worker?.workerCode ?? "—"}) reported an emergency{" "}
              {formatDistanceToNow(new Date(incident.startedAt), { addSuffix: true })}. Marking it resolved confirms the
              situation has been handled.
            </p>
          </div>
        </div>

        <div className="mt-4">
          <label htmlFor="resolve-note" className="text-xs text-muted-foreground">Note (optional)</label>
          <textarea
            id="resolve-note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={2}
            maxLength={500}
            className="mt-1 w-full rounded-sm border border-border-strong bg-card px-3 py-2 text-xs text-foreground focus-visible:border-primary focus-visible:outline-none"
          />
        </div>

        <div className="mt-6 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
          <Button ref={cancelRef} variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="danger" onClick={() => onConfirm(note.trim())} loading={loading}>
            Confirm Resolved
          </Button>
        </div>
      </div>
    </div>
  );
}
