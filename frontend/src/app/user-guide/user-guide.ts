import type { Driver, DriveStep } from "driver.js";
import "driver.js/dist/driver.css";
import "./user-guide.css";

type StartUserGuideOptions = {
  onDestroyed?: () => void;
  trigger: HTMLElement;
};

const GUIDE_CONTENT: Record<string, { description: string; title: string }> = {
  "nav:Organizations": {
    title: "Organizations",
    description: "Create, select, and administer organizations across MLSuite.",
  },
  "nav:Workspace": {
    title: "Workspace",
    description: "Manage the active workspace, its members, invitations, roles, and settings.",
  },
  "nav:Models": {
    title: "Models",
    description: "Browse registered models, inspect their metadata, and open model workflows.",
  },
  "nav:Schemas": {
    title: "Schemas",
    description: "Create and manage schemas that connect models to forms and prediction flows.",
  },
  "nav:Inferences": {
    title: "Inferences",
    description: "Review prediction runs, their inputs, outputs, reports, and feedback status.",
  },
  "nav:Plugins": {
    title: "Plugins",
    description: "Discover and configure plugins that extend model and report workflows.",
  },
  "nav:Review": {
    title: "Review",
    description: "Open assigned reviews and manage human feedback on inference results.",
  },
  "nav:Users": {
    title: "Users",
    description: "Administer platform users and their system-level access.",
  },
  "nav:Infra": {
    title: "Infrastructure",
    description: "Inspect services, logs, terminals, and alerts for the MLSuite environment.",
  },
  "subnav:Overview": {
    title: "Section overview",
    description: "Return to the summary for the currently expanded sidebar section.",
  },
  "subnav:Members": {
    title: "Members",
    description: "View people in the active workspace and manage their access when permitted.",
  },
  "subnav:Invitations": {
    title: "Invitations",
    description: "Track pending invitations and invite new workspace members when permitted.",
  },
  "subnav:Roles & Templates": {
    title: "Roles & templates",
    description: "Define reusable permission templates and assign workspace roles.",
  },
  "subnav:Settings": {
    title: "Workspace settings",
    description: "Edit settings that belong to the active organization, not your personal UI.",
  },
  "subnav:Changes": {
    title: "Schema changes",
    description: "Open draft and published change workflows for the active schema.",
  },
  "subnav:Bookmarks": {
    title: "Schema bookmarks",
    description: "Open named pointers to published snapshots of the active schema.",
  },
  "subnav:Snapshots": {
    title: "Schema snapshots",
    description: "Inspect immutable published versions of the active schema.",
  },
  "subnav:All schemas": {
    title: "All schemas",
    description: "Return to the complete schema catalog.",
  },
  "subnav:Services": {
    title: "Services",
    description: "Check the health and runtime state of infrastructure services.",
  },
  "subnav:Logs": {
    title: "Logs",
    description: "Inspect service logs when diagnosing runtime behavior.",
  },
  "subnav:Terminal": {
    title: "Terminal",
    description: "Open the administrative infrastructure terminal.",
  },
  "subnav:Alerts": {
    title: "Alerts",
    description: "Review infrastructure warnings and active alerts.",
  },
  "workspace-switcher": {
    title: "Active workspace",
    description: "Switch organizations here. Data and permissions follow the active workspace.",
  },
  "user-guide": {
    title: "User guide",
    description: "Restart this sidebar walkthrough whenever you need a navigation refresher.",
  },
  settings: {
    title: "Personal settings",
    description: "Adjust themes, typography, shortcuts, and sidebar placement for your account.",
  },
  "global-search": {
    title: "Global search",
    description: "Find resources without leaving the page you are working on.",
  },
  "toggle-theme": {
    title: "Color scheme",
    description: "Cycle through System, Light, and Dark. The displayed shortcut does the same.",
  },
  "toggle-fullscreen": {
    title: "Fullscreen",
    description: "Enter or leave fullscreen mode to change how much workspace is visible.",
  },
  "toggle-sidebar": {
    title: "Sidebar size",
    description: "Collapse the sidebar to icons or expand it to show labels and shortcuts.",
  },
  "user-menu": {
    title: "Your account",
    description: "Open your profile, notifications, workspace, or sign out from this menu.",
  },
};

let activeGuide: Driver | null = null;
let startVersion = 0;

export function availableUserGuideSteps(root: ParentNode = document): DriveStep[] {
  const steps: DriveStep[] = [];
  const sidebar = root.querySelector<HTMLElement>('[data-user-guide="sidebar"]');
  if (sidebar) {
    steps.push({
      element: sidebar,
      popover: {
        title: "Your workspace",
        description: "The sidebar keeps navigation and workspace tools available from every page.",
      },
    });
  }

  root.querySelectorAll<HTMLElement>("[data-user-guide-item]").forEach((element) => {
    if (element.closest('[aria-hidden="true"]')) return;
    const key = element.dataset.userGuideItem;
    if (!key) return;
    const content = GUIDE_CONTENT[key];
    if (content) steps.push({ element, popover: content });
  });
  return steps;
}

export function destroyUserGuide(): void {
  startVersion += 1;
  activeGuide?.destroy();
  activeGuide = null;
}

export async function startUserGuide({
  onDestroyed,
  trigger,
}: StartUserGuideOptions): Promise<boolean> {
  destroyUserGuide();
  const requestedVersion = startVersion;
  const steps = availableUserGuideSteps();
  let guide: Driver | null = null;
  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    if (activeGuide === guide) activeGuide = null;
    onDestroyed?.();
    queueMicrotask(() => {
      if (trigger.isConnected) trigger.focus();
    });
  };

  if (steps.length === 0) {
    finish();
    return false;
  }

  try {
    const { driver } = await import("driver.js");
    if (requestedVersion !== startVersion) {
      finish();
      return false;
    }

    guide = driver({
      allowClose: true,
      allowKeyboardControl: true,
      animate: !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      disableActiveInteraction: true,
      doneBtnText: "Done",
      nextBtnText: "Next",
      onDestroyed: finish,
      overlayClickBehavior: "close",
      popoverClass: "mlsuite-user-guide",
      prevBtnText: "Previous",
      showProgress: true,
      skipMissingElement: true,
      smoothScroll: true,
      steps,
    });
    activeGuide = guide;
    guide.drive();
    return true;
  } catch {
    finish();
    return false;
  }
}
