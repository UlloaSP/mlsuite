import { BookOpenText } from "lucide-react";
import { useEffect } from "react";
import { destroyUserGuide, startUserGuide } from "@/app/user-guide/user-guide";
import { SidebarLabel } from "./app-sidebar/SidebarLabel";
import { SidebarMenuButton } from "./app-sidebar/SidebarMenuButton";
import { SidebarMenuItem } from "./app-sidebar/SidebarMenuItem";
import { useSidebar } from "./app-sidebar/SidebarContext";

export function UserGuideButton() {
  const { isMobile, setOpen, state } = useSidebar();

  useEffect(() => destroyUserGuide, []);

  const start = (trigger: HTMLButtonElement) => {
    const restoreCollapsed = !isMobile && state === "collapsed";
    if (restoreCollapsed) setOpen(true);

    requestAnimationFrame(() => {
      void startUserGuide({
        trigger,
        onDestroyed: () => {
          if (restoreCollapsed) setOpen(false);
        },
      });
    });
  };

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        data-user-guide-item="user-guide"
        title="User Guide"
        onClick={(event) => start(event.currentTarget)}
      >
        <BookOpenText size={18} />
        <SidebarLabel className="truncate">User Guide</SidebarLabel>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
