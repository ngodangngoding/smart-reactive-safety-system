"use client";

import { useEffect, useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import Button from "@/components/atoms/Button.jsx";

export default function DeleteConfirmationModal({
  open,
  title,
  description,
  details = null,
  detailsLoading = false,
  requireText = null,
  loading,
  onConfirm,
  onClose,
}) {
  const cancelRef = useRef(null);
  const [typed, setTyped] = useState({ for: null, value: "" });

  useEffect(() => {
    if (!open) return undefined;
    cancelRef.current?.focus();
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const typedValue = typed.for === requireText ? typed.value : "";
  const blocked = detailsLoading || (requireText !== null && typedValue !== requireText);

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 px-4">
      <div role="dialog" aria-modal="true" aria-labelledby="delete-title" className="w-full max-w-md max-h-[90dvh] overflow-y-auto rounded-lg bg-card p-5 shadow-overlay sm:p-6">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-danger-soft">
            <Trash2 className="h-5 w-5 text-danger" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 id="delete-title" className="text-base font-semibold text-foreground">{title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
            {detailsLoading && <p className="mt-2 text-xs text-muted-foreground">Checking what else will be deleted...</p>}
            {details && !detailsLoading && <p className="mt-2 text-sm font-medium text-foreground">{details}</p>}
          </div>
        </div>

        {requireText !== null && (
          <div className="mt-4">
            <label htmlFor="delete-confirm-text" className="text-xs text-muted-foreground">
              Type <span className="font-semibold text-foreground">{requireText}</span> to confirm
            </label>
            <input
              id="delete-confirm-text"
              value={typedValue}
              onChange={(event) => setTyped({ for: requireText, value: event.target.value })}
              autoComplete="off"
              className="mt-1 h-9 w-full rounded-sm border border-border-strong bg-card px-3 text-xs text-foreground focus-visible:border-primary focus-visible:outline-none"
            />
          </div>
        )}

        <div className="mt-6 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
          <Button ref={cancelRef} variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="danger" onClick={onConfirm} loading={loading} disabled={blocked}>
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}
