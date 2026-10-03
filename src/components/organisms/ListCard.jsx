import { TriangleAlert } from "lucide-react";
import Button from "@/components/atoms/Button.jsx";
import EmptyState from "@/components/atoms/EmptyState.jsx";

export default function ListCard({ toolbar, children }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      {toolbar && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-subtle px-4 py-3.5 sm:px-5">{toolbar}</div>
      )}
      {children}
    </div>
  );
}

export function CountLabel({ shown, total, noun }) {
  return (
    <p className="text-xs tabular-nums text-muted-foreground">
      {shown} of {total} {noun}
    </p>
  );
}

export function ListError({ message, onRetry }) {
  return (
    <EmptyState
      icon={TriangleAlert}
      tone="danger"
      title={message}
      action={
        <Button variant="secondary" onClick={onRetry}>
          Try again
        </Button>
      }
    />
  );
}
