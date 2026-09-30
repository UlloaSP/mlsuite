import type { Driver, DriveStep } from "driver.js";
import "driver.js/dist/driver.css";
import { ariaShortcutLabels } from "@/shared/ui/shortcut-state";
import "./user-guide.css";
import {
  CLOSING_STEP,
  GUIDE_CONTENT,
  SIDEBAR_INTRO,
  type GuideContent,
} from "./user-guide-content";

type StartUserGuideOptions = {
  onDestroyed?: () => void;
  trigger: HTMLElement;
};

let activeGuide: Driver | null = null;
let startVersion = 0;

/** Renders an element's own aria-keyshortcuts, so customized bindings show up in the tour. */
export function shortcutMarkup(ariaShortcuts: string | null, mac?: boolean): string {
  const keys = ariaShortcutLabels(ariaShortcuts, mac);
  if (keys.length === 0) return "";
  return `<span class="mlsuite-guide-shortcut">${keys.map((key) => `<kbd>${key}</kbd>`).join("")}</span>`;
}

const popover = ({ title, description }: GuideContent, element?: HTMLElement) => ({
  title,
  description: `<p>${description}</p>${shortcutMarkup(element?.getAttribute("aria-keyshortcuts") ?? null)}`,
});

export function availableUserGuideSteps(root: ParentNode = document): DriveStep[] {
  const steps: DriveStep[] = [];
  let closing: DriveStep | null = null;
  const sidebar = root.querySelector<HTMLElement>('[data-user-guide="sidebar"]');
  // A centered welcome: highlighting the whole sidebar would bleed past the viewport edge.
  if (sidebar) steps.push({ popover: popover(SIDEBAR_INTRO) });

  root.querySelectorAll<HTMLElement>("[data-user-guide-item]").forEach((element) => {
    if (element.closest('[aria-hidden="true"]')) return;
    const key = element.dataset.userGuideItem;
    const content = key ? GUIDE_CONTENT[key] : undefined;
    if (!content) return;
    const step = { element, popover: popover(content, element) };
    if (key === CLOSING_STEP) closing = step;
    else steps.push(step);
  });
  if (closing) steps.push(closing);
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
      onHighlightStarted: (element) => {
        element?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "instant" });
      },
      overlayClickBehavior: "close",
      overlayColor: "var(--color-overlay)",
      overlayOpacity: 1,
      popoverClass: "mlsuite-user-guide",
      prevBtnText: "Previous",
      progressText: "{{current}} of {{total}}",
      stagePadding: 4,
      stageRadius: 12,
      showProgress: true,
      skipMissingElement: true,
      smoothScroll: false,
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
