import { SidebarTrigger } from "./app-sidebar";

export function MobileSidebarTrigger() {
  return (
    <SidebarTrigger className="fixed right-4 top-4 z-[80] size-10 rounded-full border border-[var(--border-soft)] bg-[var(--surface-primary)] text-[var(--text-secondary)] shadow-[var(--shadow-card)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)] xl:hidden" />
  );
}
