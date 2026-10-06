/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router";
import { useWorkspaceContext } from "@/capabilities/workspace-context/workspace-context";
import { workspaceBookmarkQueryOptions } from "@/features/explore/api/public-bookmark-api";
import { appButtonClass } from "@/shared/ui/button-styles";

/**
 * The way from a public page into the workspace that owns it, where runs are saved. The public
 * API names no workspace id, so a signed-in visitor asks their own workspace for the bookmark;
 * only members of the owning organization get an answer, and nobody else sees a link.
 */
export function WorkspaceBookmarkLink({ publicId }: { publicId: string }) {
  // Read, never fetched: the frame around every public page has already resolved the session.
  // Asking again from here would restart a failed probe and make the frame reload the page.
  const organizationId = useWorkspaceContext(false).data?.currentOrganization.id;
  const bookmark = useQuery({
    ...workspaceBookmarkQueryOptions(organizationId ?? 0, publicId),
    enabled: organizationId !== undefined,
  });

  if (!bookmark.data) return null;
  return (
    <Link
      to={`/predict/${bookmark.data.id}`}
      className={appButtonClass({ variant: "secondary", size: "sm" })}
    >
      <ArrowUpRight size={14} aria-hidden="true" />
      Open in workspace
    </Link>
  );
}
