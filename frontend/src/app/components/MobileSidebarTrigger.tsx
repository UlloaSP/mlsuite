import type { SidebarPosition } from "@/shared/ui/sidebar-position";
import { cx } from "@/shared/ui/cx";
import { SidebarTrigger } from "./app-sidebar/SidebarTrigger";

export function MobileSidebarTrigger({ side }: { side: SidebarPosition }) {
  return (
    <SidebarTrigger
      side={side}
      className={cx(
        "fixed top-4 z-[80] size-10 rounded-full border border-[var(--border-soft)] bg-[var(--surface-primary)] text-[var(--text-secondary)] shadow-[var(--shadow-card)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)] xl:hidden",
        side === "left" ? "left-4" : "right-4",
      )}
    />
  );
}
