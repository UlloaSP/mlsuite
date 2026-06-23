import { AppHeaderBrand } from "./AppHeaderBrand";
import { AppHeaderNotificationBell } from "./AppHeaderNotificationBell";
import { AppHeaderSearch } from "./AppHeaderSearch";
import { SidebarTrigger } from "./app-sidebar";

export function AppHeader() {
  return (
    <header className="relative z-50 shrink-0 border-b border-[var(--border-soft)] bg-[var(--surface-secondary)]/95 px-4 py-3 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1800px] items-center gap-3">
        <div className="flex shrink-0 items-center gap-3">
          <SidebarTrigger className="size-10 rounded-full text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)] xl:hidden" />
          <AppHeaderBrand />
        </div>
        <div className="min-w-0 flex-1">
          <AppHeaderSearch />
        </div>
        <div className="shrink-0">
          <AppHeaderNotificationBell />
        </div>
      </div>
    </header>
  );
}
