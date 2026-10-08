/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Link } from "react-router";
import { useAccountEntry } from "@/capabilities/workspace-context/account-entry";
import type { PublicRunQuotaDto } from "@/shared/api/openapi.gen";
import { formatTimestamp } from "@/shared/lib/date-time";
import { appButtonClass } from "@/shared/ui/button-styles";
import { cx } from "@/shared/ui/cx";
import { FOCUS_RING } from "@/shared/ui/focus-ring";

/**
 * The runs the caller has left on a public bookmark, as the server counted them, shown under
 * the form's run action. With none left it takes that action's place: a visitor without a
 * session is pointed to an account, which has a higher limit, and a signed-in member is told
 * when the count starts again.
 */
export function PublicRunQuota({ quota }: { quota: PublicRunQuotaDto }) {
  const entry = useAccountEntry();
  const resets = quota.resetsAt ? formatTimestamp(quota.resetsAt) : null;

  if (quota.remaining > 0) {
    return (
      <p aria-live="polite" className="text-sm text-fg-secondary">
        <span className="font-semibold text-fg">
          {quota.remaining} of {quota.limit}
        </span>{" "}
        runs left {resets ? `until ${resets}` : "in 24 hours"}.
        {entry ? (
          <>
            {" "}
            <Link
              to={entry.signInHref}
              className={cx("rounded font-semibold text-accent-strong hover:underline", FOCUS_RING)}
            >
              Sign in
            </Link>{" "}
            for a higher limit.
          </>
        ) : null}
      </p>
    );
  }
  return (
    <div
      role="status"
      className="flex flex-col gap-3 rounded-card border border-line bg-surface-subtle p-4 text-sm"
    >
      <div className="flex flex-col gap-1">
        <p className="font-semibold text-fg">
          {entry ? "Sign in to continue" : "You have reached the run limit"}
        </p>
        <p className="text-fg-secondary">
          {entry
            ? `You have used the ${quota.limit} runs this bookmark allows without an account. An account has a higher limit.`
            : `You have used your ${quota.limit} runs of this bookmark.`}
          {resets ? ` You can run it again after ${resets}.` : null}
        </p>
      </div>
      {entry ? (
        <div className="flex flex-wrap gap-2">
          <Link
            to={entry.signInHref}
            className={appButtonClass({ size: "sm", variant: "secondary" })}
          >
            Sign in
          </Link>
          <Link to={entry.registerHref} className={appButtonClass({ size: "sm" })}>
            Create account
          </Link>
        </div>
      ) : null}
    </div>
  );
}
