"use client";

import { useEffect, useRef } from "react";
import { TriangleAlert } from "lucide-react";
import Button from "@/components/atoms/Button.jsx";

export default function ConfirmModal({ open, title, description, confirmLabel = "Lanjutkan", cancelLabel = "Batal", loading = false, onConfirm, onClose }) {
  const cancelRef = useRef(null);

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

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 px-4">
      <div role="dialog" aria-modal="true" aria-labelledby="confirm-title" className="w-full max-w-md max-h-[90dvh] overflow-y-auto rounded-lg bg-card p-5 shadow-overlay sm:p-6">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-warning-soft">
            <TriangleAlert className="h-5 w-5 text-warning-soft-foreground" aria-hidden="true" />
          </span>
          <div>
            <h2 id="confirm-title" className="text-base font-semibold text-foreground">{title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
        <div className="mt-6 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
          <Button ref={cancelRef} variant="secondary" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
