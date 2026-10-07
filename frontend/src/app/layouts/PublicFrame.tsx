/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useMemo, type PropsWithChildren } from "react";
import { Link, useLocation } from "react-router";
import { EXPLORE_BREADCRUMB_ROOT, EXPLORE_PATH } from "@/app/components/explore-navigation";
import {
  AccountEntryContext,
  type AccountEntry,
} from "@/capabilities/workspace-context/account-entry";
import { registerHref, signInHref } from "@/capabilities/workspace-context/session";
import { BreadcrumbProvider } from "@/shared/ui/breadcrumb/BreadcrumbProvider";
import { appButtonClass } from "@/shared/ui/button-styles";
import { cx } from "@/shared/ui/cx";
import { FOCUS_RING } from "@/shared/ui/focus-ring";
import { MLSuiteMark } from "@/shared/ui/MLSuiteMark";
import { MLSuiteWordmark } from "@/shared/ui/MLSuiteWordmark";
import { FrameContent } from "./FrameContent";

const BREADCRUMB_ROOTS = { public: EXPLORE_BREADCRUMB_ROOT };

/**
 * The frame of a public page for a visitor without a session: the brand leading to the
 * feed, ways to sign in or create an account and come back to this page, and the page in
 * the box the app shell draws it in, with its breadcrumb trail where the visitor's device
 * shows it. Pages reach the same ways in through AccountEntryContext.
 */
export function PublicFrame({ children }: PropsWithChildren) {
  const location = useLocation();
  const returnTo = `${location.pathname}${location.search}`;
  const entry = useMemo<AccountEntry>(
    () => ({ signInHref: signInHref(returnTo), registerHref: registerHref(returnTo) }),
    [returnTo],
  );

  return (
    <BreadcrumbProvider roots={BREADCRUMB_ROOTS}>
      <div className="flex h-dvh w-screen flex-col overflow-clip bg-surface text-fg">
        <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-line px-4 sm:px-6">
          <Link
            to={EXPLORE_PATH}
            aria-label="MLSuite"
            className={cx("flex shrink-0 items-center gap-2 rounded-control text-xl", FOCUS_RING)}
          >
            <MLSuiteMark />
            {/* The narrowest phones keep the mark alone so both actions stay on one line. */}
            <span className="max-[359px]:hidden">
              <MLSuiteWordmark />
            </span>
          </Link>
          <nav aria-label="Account" className="flex shrink-0 items-center gap-2">
            <Link
              to={entry.signInHref}
              className={appButtonClass({ size: "sm", variant: "secondary" })}
            >
              Sign in
            </Link>
            <Link to={entry.registerHref} className={appButtonClass({ size: "sm" })}>
              Create account
            </Link>
          </nav>
        </header>
        <main className="flex min-h-0 min-w-0 flex-1 flex-col">
          <FrameContent>
            <AccountEntryContext.Provider value={entry}>{children}</AccountEntryContext.Provider>
          </FrameContent>
        </main>
      </div>
    </BreadcrumbProvider>
  );
}
