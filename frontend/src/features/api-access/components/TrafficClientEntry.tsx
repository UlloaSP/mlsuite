/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Ban, KeyRound, RotateCcw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useApiClientStatusMutation } from "@/features/api-access/api/api-traffic.queries";
import { ApiClientStatusBadge } from "@/features/api-access/components/ApiClientStatusBadge";
import { SuspendClientDialog } from "@/features/api-access/components/SuspendClientDialog";
import { failureMessage, formatCount, formatShare } from "@/features/api-access/lib/api-format";
import { AppActionsMenu } from "@/shared/ui/AppActionsMenu";
import { CatalogEntry } from "@/shared/ui/catalog/CatalogEntry";
import { LiveRelativeTime } from "@/shared/ui/LiveRelativeTime";
import { OrganizationMark } from "@/shared/ui/OrganizationMark";
import { useActionDialog } from "@/shared/ui/use-action-dialog";
import type { AdminApiClientDto } from "@/shared/api/openapi.gen";

/**
 * A client of any organization, for the platform: how much it called this week and how much of
 * it went wrong, never what it sent. The platform suspends it or reinstates it.
 */
export function TrafficClientEntry({ client }: { client: AdminApiClientDto }) {
  const status = useApiClientStatusMutation();
  const { confirm, dialog } = useActionDialog();
  const [suspending, setSuspending] = useState(false);

  const suspend = async (reason: string) => {
    try {
      await status.mutateAsync({ clientId: client.id, reason });
      setSuspending(false);
      toast.success(`${client.name} is suspended`);
    } catch {
      // The dialog stays open and shows the API's words.
    }
  };

  const reinstate = async () => {
    const confirmed = await confirm({
      title: `Reinstate ${client.name}?`,
      description:
        "Its keys work again at once, and its organization may give it keys and bookmarks again.",
      confirmLabel: "Reinstate",
    });
    if (!confirmed) return;
    try {
      await status.mutateAsync({ clientId: client.id, reason: null });
      toast.success(`${client.name} is active again`);
    } catch (failure) {
      toast.error("The client was not reinstated", { description: failureMessage(failure) });
    }
  };

  return (
    <>
      <CatalogEntry
        title={client.name}
        titleAccessory={<ApiClientStatusBadge status={client.status} />}
        icon={
          <OrganizationMark
            className="mt-0.5 size-5 rounded-sm"
            iconSize={16}
            logoUrl={client.organizationLogoUrl}
          />
        }
        description={client.suspensionReason ?? undefined}
        metadata={
          <>
            <span>{client.organizationName}</span>
            <span className="inline-flex items-center gap-1">
              <KeyRound size={14} />
              {client.keyCount}
            </span>
            <span>
              {client.lastUsedAt ? (
                <>
                  Last successful call <LiveRelativeTime value={client.lastUsedAt} /> ago
                </>
              ) : (
                "No successful calls yet"
              )}
            </span>
          </>
        }
        details={
          <span className="font-mono text-xs">
            {formatCount(client.weekCalls)} calls (7 days) ·{" "}
            {formatShare(client.weekErrors, client.weekCalls)} errors
          </span>
        }
        actions={
          <AppActionsMenu
            label={`Open actions for ${client.name}`}
            disabled={status.isPending}
            actions={[
              client.status === "SUSPENDED"
                ? {
                    key: "reinstate",
                    label: "Reinstate",
                    icon: RotateCcw,
                    onSelect: () => void reinstate(),
                  }
                : {
                    key: "suspend",
                    label: "Suspend…",
                    icon: Ban,
                    tone: "danger",
                    onSelect: () => setSuspending(true),
                  },
            ]}
          />
        }
      />
      {suspending ? (
        <SuspendClientDialog
          client={client}
          pending={status.isPending}
          error={status.error ? failureMessage(status.error) : undefined}
          onCancel={() => {
            status.reset();
            setSuspending(false);
          }}
          onConfirm={(reason) => void suspend(reason)}
        />
      ) : null}
      {dialog}
    </>
  );
}
