import Link from "next/link";
import { ShieldOff } from "lucide-react";
import Button from "@/components/atoms/Button.jsx";

export default function AccessDenied({ message = "You do not have permission to view this page." }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="flex w-full max-w-[440px] flex-col items-center gap-3 rounded-lg border border-border bg-card px-8 py-10 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-neutral-soft">
          <ShieldOff className="h-[26px] w-[26px] text-text-secondary" aria-hidden="true" />
        </span>
        <h1 className="text-xl font-bold text-foreground">Access Denied</h1>
        <p className="text-sm leading-[1.55] text-muted-foreground">{message}</p>
        <Link href="/dashboard" className="mt-3">
          <Button variant="secondary">Back to Dashboard</Button>
        </Link>
      </div>
    </div>
  );
}
