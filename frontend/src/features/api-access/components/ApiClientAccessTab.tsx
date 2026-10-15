/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useRevokeApiClientBookmarkMutation } from "@/features/api-access/api/api-access.mutations";
import { AccessBookmarkRow } from "@/features/api-access/components/AccessBookmarkRow";
import { GrantBookmarkDialog } from "@/features/api-access/components/GrantBookmarkDialog";
import { failureMessage } from "@/features/api-access/lib/api-format";
import { AppButton } from "@/shared/ui/AppButton";
import { AppEmptyState } from "@/shared/ui/AppEmptyState";
import { AppInlineAlert } from "@/shared/ui/AppInlineAlert";
import { useActionDialog } from "@/shared/ui/use-action-dialog";
import type { ApiAccessBookmarkDto, ApiClientDto } from "@/shared/api/openapi.gen";

type Props = { client: ApiClientDto; canManage: boolean };

/** The bookmarks a client may run, each with the id it calls it by and whether it runs now. */
export function ApiClientAccessTab({ client, canManage }: Props) {
  const revoke = useRevokeApiClientBookmarkMutation(client.client.id);
  const { confirm, dialog } = useActionDialog();
  const [granting, setGranting] = useState(false);
  const active = client.client.status === "ACTIVE";

  const askRevoke = async (bookmark: ApiAccessBookmarkDto) => {
    const confirmed = await confirm({
      title: `Take ${bookmark.name} away from ${client.client.name}?`,
      description:
        "The client's calls to this bookmark are refused at once. You can give it back later.",
      confirmLabel: "Remove",
      danger: true,
    });
    if (!confirmed) return;
    try {
      await revoke.mutateAsync(bookmark.id);
      toast.success(`${client.client.name} can no longer run ${bookmark.name}`);
    } catch {
      // The tab shows the mutation error.
    }
  };

  return (
    <div className="grid gap-4">
      {canManage ? (
        <div className="flex justify-end">
          <AppButton variant="secondary" disabled={!active} onClick={() => setGranting(true)}>
            <Plus size={16} />
            Give bookmark
          </AppButton>
        </div>
      ) : null}
      {revoke.error ? <AppInlineAlert>{failureMessage(revoke.error)}</AppInlineAlert> : null}
      {client.bookmarks.length === 0 ? (
        <AppEmptyState
          compact
          title="No bookmarks yet"
          description="Every call of this client is refused with 404 until it is given a bookmark."
        />
      ) : (
        <ul aria-label="Bookmarks" className="border-t border-line">
          {client.bookmarks.map((bookmark) => (
            <AccessBookmarkRow
              key={bookmark.id}
              bookmark={bookmark}
              disabled={revoke.isPending}
              onRevoke={canManage ? (target) => void askRevoke(target) : undefined}
            />
          ))}
        </ul>
      )}
      {canManage ? (
        <GrantBookmarkDialog client={client} open={granting} onClose={() => setGranting(false)} />
      ) : null}
      {dialog}
    </div>
  );
}
