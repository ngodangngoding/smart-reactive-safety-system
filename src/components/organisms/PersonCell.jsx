import Link from "next/link";
import Avatar from "@/components/atoms/Avatar.jsx";

export default function PersonCell({ name, photoUrl, sub, href, danger = false, suffix }) {
  return (
    <div className="flex items-center gap-3">
      <Avatar name={name} photoUrl={photoUrl} danger={danger} />
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground">
          {href ? (
            <Link href={href} className="hover:text-primary">
              {name}
            </Link>
          ) : (
            name
          )}
          {suffix}
        </p>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </div>
    </div>
  );
}
