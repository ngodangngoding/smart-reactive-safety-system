"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/settings/profile", label: "My Profile" },
  { href: "/settings/security", label: "Security" },
  { href: "/settings/google", label: "Google Account" },
  { href: "/settings/delete-account", label: "Delete Account", danger: true },
];

export default function SettingsLayout({ children }) {
  const pathname = usePathname() ?? "";

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold leading-tight text-foreground">Account Settings</h1>

      <div className="flex flex-col gap-6 rounded-lg border border-border bg-card p-4 md:flex-row md:p-6">
        <nav aria-label="Settings" className="flex shrink-0 gap-1 overflow-x-auto md:w-52 md:flex-col md:border-r md:border-border-subtle md:pr-5">
          {LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`inline-flex h-10 items-center whitespace-nowrap rounded-full px-4 text-[13px] transition-colors ${
                  active
                    ? "bg-primary-soft font-semibold text-nav-active-foreground"
                    : link.danger
                      ? "font-medium text-danger hover:bg-danger-soft"
                      : "font-medium text-text-secondary hover:bg-surface-subtle"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="min-w-0 flex-1 space-y-5">{children}</div>
      </div>
    </div>
  );
}
