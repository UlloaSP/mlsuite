/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { PropsWithChildren } from "react";
import { Link, useLocation } from "react-router";
import { appButtonClass } from "@/shared/ui/button-styles";
import { cx } from "@/shared/ui/cx";
import { FOCUS_RING } from "@/shared/ui/focus-ring";
import { MLSuiteMark } from "@/shared/ui/MLSuiteMark";
import { MLSuiteWordmark } from "@/shared/ui/MLSuiteWordmark";

/**
 * The frame of a public page for a visitor without a session: the brand, a way to sign in
 * and come back, and the page in the same sized box the app shell gives it.
 */
export function PublicFrame({ children }: PropsWithChildren) {
  const location = useLocation();
  const returnTo = encodeURIComponent(`${location.pathname}${location.search}`);

  return (
    <div className="flex h-dvh w-screen flex-col overflow-clip bg-surface text-fg">
      <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-line px-6">
        <Link
          to="/"
          aria-label="MLSuite"
          className={cx("flex items-center gap-2 rounded-control text-xl", FOCUS_RING)}
        >
          <MLSuiteMark />
          <MLSuiteWordmark />
        </Link>
        <Link
          to={`/?returnTo=${returnTo}`}
          className={appButtonClass({ size: "sm", variant: "secondary" })}
        >
          Sign in
        </Link>
      </header>
      <main className="relative min-h-0 min-w-0 flex-1 overflow-clip">{children}</main>
    </div>
  );
}
