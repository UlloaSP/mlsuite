/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { ArrowLeft, Home, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router";
import { AppButton } from "./AppButton";
import { AppPage } from "./AppPage";
import { AppSurface } from "./AppSurface";

const errorContent = {
  "module-load": [
    "Page could not load",
    "Reload the application to download the current page files.",
  ],
  0: ["Network unavailable", "Check your connection and try this route again."],
  403: ["Access denied", "Your account does not have permission to open this route."],
  404: ["Route not found", "The requested page may have moved, been deleted, or never existed."],
  500: [
    "Something went wrong",
    "An unexpected route error occurred. Try again or return to the workspace.",
  ],
} as const;

export type RouteStatus = keyof typeof errorContent;

type RouteStatusPageProps = {
  status?: RouteStatus;
  homePath?: string;
  homeLabel?: string;
  onReload?: () => void;
};

export function RouteStatusPage({
  status = 404,
  homePath = "/workspace",
  homeLabel = "Go to workspace",
  onReload = () => window.location.reload(),
}: RouteStatusPageProps) {
  const navigate = useNavigate();
  const [heading, description] = errorContent[status];

  return (
    // As tall as the window, less the navigation bar when the app shell is still around it.
    <AppPage className="min-h-[calc(100dvh-var(--app-nav-block,0px))] bg-surface text-fg">
      <AppSurface className="flex flex-1 items-center justify-center overflow-auto">
        <div className="flex w-full max-w-md flex-col items-center gap-6 text-center">
          <span className="rounded-full border border-line bg-surface-muted px-3 py-1 font-mono text-xs text-fg-secondary">
            {status === "module-load" ? "Load failed" : status === 0 ? "Offline" : status}
          </span>
          <div>
            <h1 className="text-3xl font-semibold leading-[1.05] tracking-[-0.8px] text-fg">
              {heading}
            </h1>
            <p className="mt-2 text-sm leading-6 text-fg-muted">{description}</p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {status === "module-load" ? (
              <AppButton onClick={onReload}>
                <RefreshCw className="size-4" />
                Reload application
              </AppButton>
            ) : null}
            <AppButton
              variant={status === "module-load" ? "secondary" : "primary"}
              onClick={() => navigate(homePath)}
            >
              <Home className="size-4" />
              {homeLabel}
            </AppButton>
            <AppButton variant="secondary" onClick={() => navigate(-1)}>
              <ArrowLeft className="size-4" />
              Go back
            </AppButton>
          </div>
        </div>
      </AppSurface>
    </AppPage>
  );
}

export { RouteStatusPage as NotFoundError };
