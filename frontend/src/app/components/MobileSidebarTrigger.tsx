import type { SidebarPosition } from "@/shared/ui/sidebar-position";
import { cx } from "@/shared/ui/cx";
import { SidebarTrigger } from "./app-sidebar/SidebarTrigger";

export function MobileSidebarTrigger({ side }: { side: SidebarPosition }) {
  return (
    <div
      className={cx(
        "flex shrink-0 px-4 pt-4 xl:hidden",
        side === "left" ? "justify-start" : "justify-end",
      )}
    >
      <SidebarTrigger
        side={side}
        className="size-10 rounded-full border border-line bg-surface text-fg-secondary shadow-card hover:bg-surface-muted hover:text-fg"
      />
    </div>
  );
}
