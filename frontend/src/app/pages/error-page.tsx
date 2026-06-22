/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { ArrowLeft, Check, Home, X } from "lucide-react";
import { m as motion } from "motion/react";
import { useNavigate } from "react-router";
import { useUser } from "../../api/user/hooks";
import { MLSuiteMark } from "../components/MLSuiteMark";
import { AppPage } from "../components";

const errorDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
});
const gridLines = [1, 2, 3, 4, 5, 6, 7].map((value) => ({
  key: `grid-${value}`,
  left: `${value * (100 / 8)}%`,
}));

export function NotFoundError() {
  const navigate = useNavigate();
  const { data: user } = useUser();
  const currentDate = errorDateFormatter.format(Date.now());

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
              HTTP 404 - Page Not Found
            </p>
            <h1 className="m-0 text-[4.4rem] font-semibold leading-[0.93] tracking-[-0.05em] sm:text-[5.6rem] lg:text-[5.25rem] xl:text-[6rem]">
              This route
              <br />
              could not
              <br />
              <span className="text-transparent [-webkit-text-stroke:2px_#111]">be found.</span>
            </h1>
            <p className="mt-4 max-w-[720px] text-xs leading-7 text-[#777]">
              The page you requested may have moved, been deleted, or never existed. Check the URL
              or return to a valid MLSuite entry point.
            </p>
          </section>

          <section className="mt-10 lg:mt-0 lg:flex-1 lg:pl-10">
            <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.1em] text-[#aaa]">
              Navigation
            </p>
            <div className="flex flex-col gap-[9px]">
              <button
                type="button"
                onClick={() => navigate(user ? "/workspace" : "/")}
                className="flex w-full items-center justify-center gap-2 rounded-md bg-[#ff385c] px-4 py-[11px] text-[13px] font-semibold text-white transition hover:bg-[#e8294d]"
              >
                <Home className="size-4" />
                {user ? "Go to Workspace" : "Go to Sign in"}
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

            <div className="mt-6 rounded-md border border-[#ff385c]/20 bg-[#ff385c]/[0.04] px-4 py-3.5">
              <p className="flex items-center gap-2 font-mono text-[11px] leading-7 text-[#aaa]">
                <Check className="size-3.5 text-[#22c55e]" />
                API services operational
              </p>
              <p className="flex items-center gap-2 font-mono text-[11px] leading-7 text-[#aaa]">
                <Check className="size-3.5 text-[#22c55e]" />
                Manual auth services reachable
              </p>
              <p className="flex items-center gap-2 font-mono text-[11px] leading-7 text-[#aaa]">
                <X className="size-3.5 text-[#ff385c]" />
                Requested route: not found
              </p>
            </div>
          </section>
        </main>
      </motion.div>
    </AppPage>
  );
}
