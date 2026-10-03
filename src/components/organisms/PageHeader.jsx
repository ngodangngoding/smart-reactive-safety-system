import Link from "next/link";
import { Plus } from "lucide-react";
import Button from "@/components/atoms/Button.jsx";

export default function PageHeader({ title, description, addHref, addLabel, children }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold leading-tight text-foreground">{title}</h1>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {children}
      {addHref && (
        <Link href={addHref}>
          <Button className="whitespace-nowrap">
            <Plus className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
            {addLabel}
          </Button>
        </Link>
      )}
    </div>
  );
}
