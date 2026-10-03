"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { CalendarX2 } from "lucide-react";
import Button from "@/components/atoms/Button.jsx";
import { LICENSE_BLOCK_KEY } from "@/services/apiService.js";

const COPY = {
  LICENSE_EXPIRED: { title: "License expired", body: "Your organization's license has expired. Ask a Super Admin to renew it, then sign in again." },
  LICENSE_NOT_STARTED: { title: "License not active yet", body: "Your organization's license has not started yet. Try again once it begins, or ask a Super Admin." },
};

let stored;
function readBlock() {
  if (stored === undefined) {
    try {
      stored = JSON.parse(window.sessionStorage.getItem(LICENSE_BLOCK_KEY));
    } catch {
      stored = null;
    }
  }
  return stored;
}
const subscribe = () => () => {};
const readServerBlock = () => null;

export default function LicenseExpiredPage() {
  const router = useRouter();
  const block = useSyncExternalStore(subscribe, readBlock, readServerBlock);

  useEffect(() => {
    if (block?.message) toast.error(block.message, { id: "license-block" });
    window.sessionStorage.removeItem(LICENSE_BLOCK_KEY);
  }, [block]);

  const copy = COPY[block?.code] ?? COPY.LICENSE_EXPIRED;

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="flex w-full max-w-sm flex-col items-center gap-4 rounded-2xl border border-border bg-card p-8 text-center shadow-overlay">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-danger-soft">
          <CalendarX2 className="h-6 w-6 text-danger" aria-hidden="true" />
        </span>
        <h1 className="text-lg font-semibold text-foreground">{copy.title}</h1>
        <p className="text-sm text-muted-foreground">{copy.body}</p>
        <Button type="button" variant="secondary" className="w-full" onClick={() => router.push("/login")}>
          Back to sign in
        </Button>
      </div>
    </div>
  );
}
