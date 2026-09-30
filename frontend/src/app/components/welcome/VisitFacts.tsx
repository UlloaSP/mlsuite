/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { AppBadge } from "@/shared/ui/AppBadge";
import { PageFacts } from "./PageFacts";
import { visitViewState } from "./visit-view-state";

/**
 * What the member was looking at on that page: its live facts (the record it
 * shows, or what its catalog holds) and the view they left it in.
 */
export function VisitFacts({ href }: { href: string }) {
  const view = visitViewState(href);

  return (
    <div className="flex flex-col gap-5">
      <PageFacts path={href.split("?")[0]} />
      {view.length > 0 ? (
        <div className="flex flex-col gap-2">
          <p className="text-2xs font-semibold uppercase tracking-eyebrow text-fg-muted">
            Your view
          </p>
          <ul className="flex flex-wrap gap-2">
            {view.map((fact) => (
              <li key={`${fact.label}:${fact.value}`}>
                <AppBadge>
                  <span className="text-fg-muted">{fact.label}</span>&nbsp;{fact.value}
                </AppBadge>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
