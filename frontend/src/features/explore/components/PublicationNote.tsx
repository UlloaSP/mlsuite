/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { ScrollText } from "lucide-react";
import { noteSegments } from "@/features/explore/lib/publication-note-links";

/**
 * The publisher's note on a public bookmark: where the model was published, a DOI, terms of
 * use. It is the organization's own words, shown as typed, with the links in it made to open.
 */
export function PublicationNote({
  note,
  organizationName,
}: {
  note: string;
  organizationName: string;
}) {
  return (
    <aside
      aria-label={`Note from ${organizationName}`}
      className="flex shrink-0 gap-3 rounded-card border border-info-border bg-info-subtle px-4 py-3 text-sm text-fg"
    >
      <ScrollText size={16} className="mt-0.5 shrink-0 text-info-fg" aria-hidden="true" />
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-info-fg">
          Note from {organizationName}
        </p>
        <p className="mt-1 whitespace-pre-line break-words leading-6">
          {noteSegments(note).map((segment, index) =>
            segment.kind === "link" ? (
              <a
                key={index}
                href={segment.href}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="font-medium text-accent-strong underline decoration-accent-border underline-offset-2 hover:decoration-accent-strong"
              >
                {segment.text}
              </a>
            ) : (
              <span key={index}>{segment.text}</span>
            ),
          )}
        </p>
      </div>
    </aside>
  );
}
