/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { ArrowLeft, Home, RefreshCw } from "lucide-react";
import { m as motion } from "motion/react";
import { useNavigate } from "react-router";
import { MLSuiteMark } from "./MLSuiteMark";
import { AppPage } from "./AppPage";

const errorDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
});
const gridLines = [1, 2, 3, 4, 5, 6, 7].map((value) => ({
  key: `grid-${value}`,
  left: `${value * (100 / 8)}%`,
}));

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
  homeLabel = "Go to Workspace",
  onReload = () => window.location.reload(),
}: RouteStatusPageProps) {
  const navigate = useNavigate();
  const currentDate = errorDateFormatter.format(Date.now());
  const [heading, description] = errorContent[status];

  return (
    <AppPage className="min-h-dvh bg-[#fdfcf8] text-[#111111]">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative flex min-h-dvh w-full flex-col overflow-hidden font-[var(--font-display)]"
      >
        {gridLines.map((line) => (
          <div
            key={line.key}
            className="pointer-events-none absolute bottom-0 top-0 w-px bg-black/[0.04]"
            style={{ left: line.left }}
          />
        ))}

        <header className="relative z-10 shrink-0 px-6 pt-5 sm:px-11">
          <div className="mb-2.5 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.08em] text-[#aaa]">
            <span>Vol. 2 - Issue 4</span>
            <span>{currentDate}</span>
          </div>
          <div className="mb-1.5 h-0.5 bg-[#111]" />
          <div className="flex items-center justify-center py-2.5">
            <div className="flex items-center gap-2.5">
              <MLSuiteMark />
              <span className="text-[28px] font-bold leading-none tracking-[-0.04em]">MLSuite</span>
            </div>
          </div>
          <div className="h-px bg-[#111]" />
          <div className="mt-[3px] h-[3px] bg-[#111]" />
        </header>

        <main className="relative z-10 flex flex-1 flex-col justify-between px-6 pb-10 sm:px-11 lg:flex-row lg:items-end lg:justify-start">
          <section className="border-black/10 pt-6 lg:flex-[0_0_58%] lg:border-r lg:pr-10">
            <p className="mb-2.5 font-mono text-[10px] uppercase tracking-[0.12em] text-[#ff385c]">
              {status === "module-load"
                ? "Page loading error"
                : status === 0
                  ? "Network error"
                  : `HTTP ${status}`}
            </p>
            <h1 className="m-0 text-[4.4rem] font-semibold leading-[0.93] tracking-[-0.05em] sm:text-[5.6rem] lg:text-[5.25rem] xl:text-[6rem]">
              {heading}
            </h1>
            <p className="mt-4 max-w-[720px] text-xs leading-7 text-[#777]">{description}</p>
          </section>

          <section className="mt-10 lg:mt-0 lg:flex-1 lg:pl-10">
            <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.1em] text-[#aaa]">
              Navigation
            </p>
            <div className="flex flex-col gap-[9px]">
              {status === "module-load" ? (
                <button
                  type="button"
                  onClick={onReload}
                  className="flex w-full items-center justify-center gap-2 rounded-md bg-[#ff385c] px-4 py-[11px] text-[13px] font-semibold text-white transition hover:bg-[#e8294d]"
                >
                  <RefreshCw className="size-4" />
                  Reload application
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => navigate(homePath)}
                className="flex w-full items-center justify-center gap-2 rounded-md bg-[#ff385c] px-4 py-[11px] text-[13px] font-semibold text-white transition hover:bg-[#e8294d]"
              >
                <Home className="size-4" />
                {homeLabel}
              </button>
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="flex w-full items-center justify-center gap-2 rounded-md border-[1.5px] border-[#ddd] bg-white px-4 py-[11px] text-[13px] font-semibold text-[#222] transition hover:border-[#ccc] hover:bg-[#f5f5f5]"
              >
                <ArrowLeft className="size-4" />
                Go Back
              </button>
            </div>

            <p className="mt-6 font-mono text-[11px] text-[#aaa]">
              Status: {status === "module-load" ? "page load failed" : status || "offline"}
            </p>
          </section>
        </main>
      </motion.div>
    </AppPage>
  );
}

export { RouteStatusPage as NotFoundError };
