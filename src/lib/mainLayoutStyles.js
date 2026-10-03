export function getMainContentClassName(sidebarOpen) {
  return ['flex', 'min-h-screen', 'min-w-0', 'flex-col', 'overflow-x-hidden', 'text-foreground', sidebarOpen ? 'md:pl-60' : ''].filter(Boolean).join(' ');
}
