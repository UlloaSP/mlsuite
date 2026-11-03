/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useMemo, type PropsWithChildren } from "react";
import { useLocation } from "@tanstack/react-router";
import { AppLink } from "@/shared/ui/AppLink";
import { EXPLORE_PATH } from "@/app/components/explore-navigation";
import {
  AccountEntryContext,
  type AccountEntry,
} from "@/capabilities/workspace-context/account-entry";
import { registerLink, signInLink } from "@/capabilities/workspace-context/session";
import { BreadcrumbProvider } from "@/shared/ui/breadcrumb/BreadcrumbProvider";
import { appButtonClass } from "@/shared/ui/button-styles";
import { cx } from "@/shared/ui/cx";
import { FOCUS_RING } from "@/shared/ui/focus-ring";
import { PinnedLocationDisplayContext } from "@/shared/ui/location-display";
import { MLSuiteMark } from "@/shared/ui/MLSuiteMark";
import { MLSuiteWordmark } from "@/shared/ui/MLSuiteWordmark";
import { FrameContent } from "./FrameContent";

/**
 * The frame of a public page for a visitor without a session: the brand leading to the
 * feed, ways to sign in or create an account and come back to this page, and the page in
 * the box the app shell draws it in. Its breadcrumb trail is always above the title: moving or
 * hiding it is a member's setting, and one left on this device does not apply to a visitor.
 * Pages reach the same ways in through AccountEntryContext.
 */
export function PublicFrame({ children }: PropsWithChildren) {
  const returnTo = useLocation({ select: (location) => location.pathname + location.searchStr });
  const entry = useMemo<AccountEntry>(
    () => ({ signIn: signInLink(returnTo), register: registerLink(returnTo) }),
    [returnTo],
  );

  return (
    <BreadcrumbProvider>
      <div className="flex h-dvh w-screen flex-col overflow-clip bg-surface text-fg">
        <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-line px-4 sm:px-6">
          <AppLink
            to={EXPLORE_PATH}
            aria-label="MLsuite"
            className={cx("flex shrink-0 items-center gap-2 rounded-control text-xl", FOCUS_RING)}
          >
            <MLSuiteMark />
            {/* The narrowest phones keep the mark alone so both actions stay on one line. */}
            <span className="max-[359px]:hidden">
              <MLSuiteWordmark />
            </span>
          </AppLink>
          <nav aria-label="Account" className="flex shrink-0 items-center gap-2">
            <AppLink
              {...entry.signIn}
              className={appButtonClass({ size: "sm", variant: "secondary" })}
            >
              Sign in
            </AppLink>
            <AppLink {...entry.register} className={appButtonClass({ size: "sm" })}>
              Create account
            </AppLink>
          </nav>
        </header>
        <main className="flex min-h-0 min-w-0 flex-1 flex-col">
          <PinnedLocationDisplayContext.Provider value="breadcrumb-top">
            <FrameContent>
              <AccountEntryContext.Provider value={entry}>{children}</AccountEntryContext.Provider>
            </FrameContent>
          </PinnedLocationDisplayContext.Provider>
        </main>
      </div>
    </BreadcrumbProvider>
  );
}
