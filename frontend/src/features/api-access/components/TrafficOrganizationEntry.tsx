/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Gauge } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useApiCallLimitMutation } from "@/features/api-access/api/api-traffic.queries";
import { CallLimitDialog } from "@/features/api-access/components/CallLimitDialog";
import { failureMessage, formatCount } from "@/features/api-access/lib/api-format";
import { AppActionsMenu } from "@/shared/ui/AppActionsMenu";
import { AppBadge } from "@/shared/ui/AppBadge";
import { CatalogEntry } from "@/shared/ui/catalog/CatalogEntry";
import { OrganizationMark } from "@/shared/ui/OrganizationMark";
import type { AdminApiOrganizationDto } from "@/shared/api/openapi.gen";

/** An organization with API clients: its month against its limit, which the platform sets. */
export function TrafficOrganizationEntry({
  organization,
}: {
  organization: AdminApiOrganizationDto;
}) {
  const limit = useApiCallLimitMutation();
  const [editing, setEditing] = useState(false);

  const save = async (monthlyCalls: number | null) => {
    try {
      await limit.mutateAsync({ organizationId: organization.organizationId, monthlyCalls });
      setEditing(false);
      toast.success(`${organization.name}'s limit was saved`);
    } catch {
      // The dialog stays open and shows the API's words.
    }
  };

  return (
    <>
      <CatalogEntry
        title={organization.name}
        titleAccessory={
          organization.customLimit ? (
            <AppBadge tone="info">Own limit</AppBadge>
          ) : (
            <AppBadge>Default limit</AppBadge>
          )
        }
        icon={
          <OrganizationMark
            className="mt-0.5 size-5 rounded-sm"
            iconSize={16}
            logoUrl={organization.logoUrl}
          />
        }
        metadata={
          <span>
            {organization.clientCount === 1 ? "1 client" : `${organization.clientCount} clients`}
          </span>
        }
        details={
          <span className="font-mono text-xs">
            {formatCount(organization.monthCalls)} / {formatCount(organization.monthlyLimit)} calls
            this month
          </span>
        }
        actions={
          <AppActionsMenu
            label={`Open actions for ${organization.name}`}
            actions={[
              {
                key: "limit",
                label: "Set monthly limit…",
                icon: Gauge,
                onSelect: () => setEditing(true),
              },
            ]}
          />
        }
      />
      {editing ? (
        <CallLimitDialog
          organization={organization}
          pending={limit.isPending}
          error={limit.error ? failureMessage(limit.error) : undefined}
          onCancel={() => {
            limit.reset();
            setEditing(false);
          }}
          onConfirm={(monthlyCalls) => void save(monthlyCalls)}
        />
      ) : null}
    </>
  );
}
