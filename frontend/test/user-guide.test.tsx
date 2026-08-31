// @vitest-environment jsdom

import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { UserGuideButton } from "@/app/components/UserGuideButton";
import { SidebarProvider } from "@/app/components/app-sidebar/SidebarContext";
import { SidebarMenu } from "@/app/components/app-sidebar/SidebarMenu";
import { destroyUserGuide, startUserGuide } from "@/app/user-guide/user-guide";

const driverMocks = vi.hoisted(() => ({
  configs: [] as Array<Record<string, unknown>>,
  failDrive: false,
  instances: [] as Array<{
    destroy: ReturnType<typeof vi.fn<() => void>>;
    drive: ReturnType<typeof vi.fn<() => void>>;
  }>,
}));

vi.mock("driver.js", () => ({
  driver: vi.fn((config: Record<string, unknown>) => {
    driverMocks.configs.push(config);
    const instance = {
      destroy: vi.fn(() => (config.onDestroyed as (() => void) | undefined)?.()),
      drive: vi.fn(() => {
        if (driverMocks.failDrive) throw new Error("driver failed");
      }),
    };
    driverMocks.instances.push(instance);
    return instance;
  }),
}));

function Harness({ includeTargets = true }: { includeTargets?: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <SidebarProvider open={open} onOpenChange={setOpen}>
      <output data-testid="sidebar-state">{open ? "expanded" : "collapsed"}</output>
      {includeTargets ? (
        <>
          <div data-user-guide="sidebar" />
          <div data-user-guide-item="nav:Models" />
          <div data-user-guide-item="nav:Schemas" />
          <div data-user-guide-item="toggle-theme" />
          <div aria-hidden="true">
            <div data-user-guide-item="subnav:Alerts" />
          </div>
        </>
      ) : null}
      <SidebarMenu>
        <UserGuideButton />
      </SidebarMenu>
    </SidebarProvider>
  );
}

describe("user guide", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    driverMocks.configs.length = 0;
    driverMocks.instances.length = 0;
    driverMocks.failDrive = false;
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    });
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({
        addEventListener: vi.fn(),
        matches: false,
        removeEventListener: vi.fn(),
      })),
    );
  });

  afterEach(async () => {
    destroyUserGuide();
    await act(async () => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });

  it("expands the desktop sidebar, filters missing targets, then restores state and focus", async () => {
    await act(async () => root.render(<Harness />));
    const button = container.querySelector<HTMLButtonElement>("button")!;
    button.focus();

    await act(async () => {
      button.click();
      await vi.dynamicImportSettled();
    });

    expect(container.querySelector('[data-testid="sidebar-state"]')?.textContent).toBe("expanded");
    expect(driverMocks.instances[0].drive).toHaveBeenCalledOnce();
    const steps = driverMocks.configs[0].steps as Array<{
      popover: { description: string; title: string };
    }>;
    expect(steps).toHaveLength(5);
    expect(steps.map(({ popover }) => popover.title)).toEqual([
      "Your workspace",
      "Models",
      "Schemas",
      "Color scheme",
      "User guide",
    ]);
    expect(steps[1].popover.description).toContain("registered models");
    expect(steps[2].popover.description).toContain("schemas");
    expect(steps[3].popover.description).toContain("System, Light, and Dark");

    await act(async () => driverMocks.instances[0].destroy());
    await Promise.resolve();

    expect(container.querySelector('[data-testid="sidebar-state"]')?.textContent).toBe("collapsed");
    expect(document.activeElement).toBe(button);
  });

  it("restores sidebar and focus without starting when every target is absent", async () => {
    await act(async () => root.render(<Harness includeTargets={false} />));
    const button = container.querySelector<HTMLButtonElement>("button")!;
    button.removeAttribute("data-user-guide-item");
    button.focus();

    await act(async () => {
      button.click();
      await vi.dynamicImportSettled();
    });
    await Promise.resolve();

    expect(driverMocks.instances).toHaveLength(0);
    expect(container.querySelector('[data-testid="sidebar-state"]')?.textContent).toBe("collapsed");
    expect(document.activeElement).toBe(button);
  });

  it("cleans up when Driver fails to start", async () => {
    driverMocks.failDrive = true;
    await act(async () => root.render(<Harness />));
    const button = container.querySelector<HTMLButtonElement>("button")!;
    button.focus();

    await act(async () => {
      button.click();
      await vi.dynamicImportSettled();
    });
    await Promise.resolve();

    expect(container.querySelector('[data-testid="sidebar-state"]')?.textContent).toBe("collapsed");
    expect(document.activeElement).toBe(button);
  });

  it("destroys an active instance before starting another", async () => {
    const trigger = document.createElement("button");
    const target = document.createElement("div");
    target.dataset.userGuide = "sidebar";
    document.body.append(trigger, target);

    await startUserGuide({ trigger });
    await startUserGuide({ trigger });

    expect(driverMocks.instances[0].destroy).toHaveBeenCalledOnce();
    expect(driverMocks.instances[1].drive).toHaveBeenCalledOnce();
    trigger.remove();
    target.remove();
  });
});
