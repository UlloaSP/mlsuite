/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Link } from "react-router";
import { useAccountEntry } from "@/capabilities/workspace-context/account-entry";
import { cx } from "@/shared/ui/cx";
import { FOCUS_RING } from "@/shared/ui/focus-ring";

/**
 * One line for a visitor without a session: what MLsuite is and that an account lets
 * them publish here too. It promises only what a new account can do today.
 */
export function ExploreVisitorIntro() {
  const entry = useAccountEntry();

  if (!entry) return null;

  return (
    <p className="max-w-2xl text-sm leading-5 text-fg-muted">
      MLsuite turns trained models into forms anyone can open.{" "}
      <Link
        to={entry.registerHref}
        className={cx("rounded font-semibold text-accent-strong hover:underline", FOCUS_RING)}
      >
        Create an account
      </Link>{" "}
      to publish your own.
    </p>
  );
}
