"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import Button from "@/components/atoms/Button.jsx";
import { getCurrentUser, isAuthenticated, logout } from "@/services/authService.js";

export default function PendingPage() {
  const router = useRouter();
  const [email, setEmail] = useState(null);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/login");
      return;
    }
    getCurrentUser()
      .then((me) => {
        if (me.user.role !== "PENDING") router.replace(me.user.role === "SUPERADMIN" ? "/organizations" : "/dashboard");
        else setEmail(me.user.email);
      })
      .catch(() => router.replace("/login"));
  }, [router]);

  if (!email) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background px-4" role="status" aria-label="Loading" aria-busy="true">
        <div className="flex w-full max-w-sm animate-pulse flex-col items-center gap-4 rounded-2xl border border-border bg-card p-8">
          <div className="h-10 w-10 rounded-md bg-border-subtle" />
          <div className="h-5 w-40 rounded bg-border-subtle" />
          <div className="h-3 w-full rounded bg-border-subtle" />
          <div className="h-3 w-4/5 rounded bg-border-subtle" />
          <div className="h-9 w-full rounded-sm bg-border-subtle" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="flex w-full max-w-sm flex-col items-center gap-4 rounded-2xl border border-border bg-card p-8 text-center shadow-overlay">
        <span className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-white">
          <ShieldCheck className="h-[22px] w-[22px]" aria-hidden="true" />
        </span>
        <h1 className="text-lg font-semibold text-foreground">Awaiting access</h1>
        <p className="text-sm text-muted-foreground">
          Signed in as <span className="font-medium text-foreground">{email}</span>. A Super Admin needs to assign you a role and
          organization before you can use the dashboard.
        </p>
        <Button
          type="button"
          variant="secondary"
          className="w-full"
          onClick={() => {
            logout();
            router.push("/login");
          }}
        >
          Sign out
        </Button>
      </div>
    </div>
  );
}
