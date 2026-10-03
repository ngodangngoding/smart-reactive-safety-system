const BASE_NAV_ITEM_CLASS = "flex h-9 items-center gap-2.5 rounded-sm px-2.5 text-[13px] transition-colors";

export function getSidebarNavItemClassName(active) {
  const stateClass = active
    ? "bg-primary-soft font-semibold text-nav-active-foreground"
    : "font-medium !text-text-secondary hover:bg-surface-subtle";

  return `${BASE_NAV_ITEM_CLASS} ${stateClass}`;
}
