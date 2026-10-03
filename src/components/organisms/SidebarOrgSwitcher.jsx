"use client";

import OrgSwitcher from "./OrgSwitcher.jsx";

export default function SidebarOrgSwitcher() {
  return (
    <div className="mt-auto">
      <p className="mb-1.5 px-2.5 text-[11px] font-bold uppercase tracking-[0.1em] text-text-group">Switch organization</p>
      <OrgSwitcher />
    </div>
  );
}
