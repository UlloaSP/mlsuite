/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { ArrowLeft, Home, RotateCw } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { AppPage } from "./AppPage";
import { MLSuiteMark } from "./MLSuiteMark";
import { MLSuiteWordmark } from "./MLSuiteWordmark";
import { RouteStatusRing } from "./RouteStatusRing";
import "./route-status-page.css";

/** Ring label, headline (light line, heavy line) and description for each status. */
const errorContent = {
  "module-load": [
    "EXITED",
    "Page could",
    "not load.",
    "Reload the application to download the current page files.",
  ],
  0: ["OFFLINE", "Network", "unavailable.", "Check your connection and try this route again."],
  403: ["403", "Access", "denied.", "Your account does not have permission to open this route."],
  404: [
    "404",
    "Route",
    "not found.",
    "The requested page may have moved, been deleted, or never existed.",
  ],
  500: [
    "ERROR",
    "Something",
    "went wrong.",
    "An unexpected route error occurred. Try again or return to the workspace.",
  ],
} as const;

export type RouteStatus = keyof typeof errorContent;

export const ROUTE_RELOAD_SECONDS = 5;

type RouteStatusPageProps = {
  status?: RouteStatus;
  homePath?: string;
  homeLabel?: string;
  onReload?: () => void;
};

const reloadApplication = () => window.location.reload();

export function RouteStatusPage({
  status = 404,
  homePath = "/workspace",
  homeLabel = "Go to workspace",
  onReload = reloadApplication,
}: RouteStatusPageProps) {
  const navigate = useNavigate();
  const [label, light, heavy, description] = errorContent[status];
  // Only a page whose files failed to download is cured by loading the application again.
  const reloads = status === "module-load";
  const seconds = useReloadCountdown(reloads, onReload);

  return (
    <AppPage className="route-status">
      <div className="route-status-glow" />
      <div className="route-status-brand">
        <MLSuiteMark size={22} />
        <MLSuiteWordmark />
      </div>
      <div className="route-status-body">
        <RouteStatusRing label={label} />
        <div className="route-status-copy">
          <h1 className="route-status-headline">
            <span className="font-extralight">{light} </span>
            <br />
            <span className="font-extrabold">{heavy}</span>
          </h1>
          <p className="route-status-description">{description}</p>
          <div className="route-status-actions">
            {reloads ? (
              <button type="button" className="route-status-action" data-primary onClick={onReload}>
                <RotateCw className="size-[17px]" />
                Reload application
              </button>
            ) : (
              <button
                type="button"
                className="route-status-action"
                data-primary
                onClick={() => navigate(homePath)}
              >
                <Home className="size-[17px]" />
                {homeLabel}
              </button>
            )}
            <button type="button" className="route-status-action" onClick={() => navigate(-1)}>
              <ArrowLeft className="size-4" />
              Go back
            </button>
          </div>
          {reloads ? (
            <p className="route-status-countdown">
              This page reloads automatically in <strong>{seconds}</strong>{" "}
              {seconds === 1 ? "second" : "seconds"}.
            </p>
          ) : null}
        </div>
      </div>
    </AppPage>
  );
}

/** Counts down once a second and reloads at zero, then starts over if the page is still here. */
function useReloadCountdown(active: boolean, onReload: () => void) {
  const [seconds, setSeconds] = useState(ROUTE_RELOAD_SECONDS);

  useEffect(() => {
    if (!active) return;
    const timeout = window.setTimeout(() => {
      if (seconds > 1) {
        setSeconds(seconds - 1);
        return;
      }
      onReload();
      setSeconds(ROUTE_RELOAD_SECONDS);
    }, 1000);
    return () => window.clearTimeout(timeout);
  }, [active, seconds, onReload]);

  return seconds;
}

export { RouteStatusPage as NotFoundError };
