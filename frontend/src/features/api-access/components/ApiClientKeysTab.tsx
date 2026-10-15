/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { toast } from "sonner";
import { useRevokeApiClientKeyMutation } from "@/features/api-access/api/api-access.mutations";
import { ApiClientKeyRow } from "@/features/api-access/components/ApiClientKeyRow";
import { failureMessage } from "@/features/api-access/lib/api-format";
import { AppEmptyState } from "@/shared/ui/AppEmptyState";
import { AppInlineAlert } from "@/shared/ui/AppInlineAlert";
import { useActionDialog } from "@/shared/ui/use-action-dialog";
import type { ApiClientDto, ApiClientKeyDto } from "@/shared/api/openapi.gen";

type Props = { client: ApiClientDto; canManage: boolean };

/**
 * A client's keys, oldest first. A key is replaced by issuing the new one, moving the software
 * to it, and only then revoking the old one, so the client never stops.
 */
export function ApiClientKeysTab({ client, canManage }: Props) {
  const revoke = useRevokeApiClientKeyMutation(client.client.id);
  const { confirm, dialog } = useActionDialog();

  const askRevoke = async (apiKey: ApiClientKeyDto) => {
    const confirmed = await confirm({
      title: `Revoke ${apiKey.name}?`,
      description: `Calls made with ${apiKey.prefix}… are refused at once. This cannot be undone; ${client.client.name} keeps its other keys.`,
      confirmLabel: "Revoke",
      danger: true,
    });
    if (!confirmed) return;
    try {
      await revoke.mutateAsync(apiKey.id);
      toast.success(`${apiKey.name} was revoked`);
    } catch {
      // The tab shows the mutation error.
    }
  };

  return (
    <div className="grid gap-4">
      {revoke.error ? <AppInlineAlert>{failureMessage(revoke.error)}</AppInlineAlert> : null}
      {client.keys.length === 0 ? (
        <AppEmptyState
          compact
          title="No keys yet"
          description="The client cannot call until it has a key. Issue one for each place its software runs."
        />
      ) : (
        <ul aria-label="Keys" className="border-t border-line">
          {client.keys.map((apiKey) => (
            <ApiClientKeyRow
              key={apiKey.id}
              apiKey={apiKey}
              disabled={revoke.isPending}
              onRevoke={canManage ? (target) => void askRevoke(target) : undefined}
            />
          ))}
        </ul>
      )}
      {client.keys.length > 1 ? (
        <p className="text-xs text-fg-muted">
          Every key works until it is revoked. To replace one, move the software to the new key
          first, then revoke the old one.
        </p>
      ) : null}
      {dialog}
    </div>
  );
}
