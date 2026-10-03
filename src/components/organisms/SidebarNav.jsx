"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_GROUPS } from "./navConfig.js";
import { getSidebarNavItemClassName } from "./sidebarNavStyles.js";
import { useOrgContext } from "@/lib/orgContext.js";

export default function SidebarNav({ onNavigate }) {
  const pathname = usePathname() ?? "";
  const { isSuperAdmin, actingAsOrg, canReadMenu } = useOrgContext();
  const home = isSuperAdmin && !actingAsOrg;

  const groups = NAV_GROUPS.filter((group) => group.always || (group.homeOnly ? home : !home))
    .map((group) => ({ ...group, items: group.items.filter((item) => !item.menu || canReadMenu(item.menu)) }))
    .filter((group) => group.items.length > 0);

  return (
    <nav aria-label="Main" className="flex flex-col gap-5">
      {groups.map((group) => (
        <div key={group.label}>
          <p className="mb-1.5 px-2.5 text-[11px] font-bold uppercase tracking-[0.1em] text-text-group">{group.label}</p>
          <ul className="flex flex-col gap-0.5">
            {group.items.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    onClick={onNavigate}
                    className={getSidebarNavItemClassName(active)}
                  >
                    <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden="true" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
