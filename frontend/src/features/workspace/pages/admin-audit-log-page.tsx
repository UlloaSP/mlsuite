/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { PlatformAuditLog } from "@/features/workspace/components/PlatformAuditLog";
import { AppPage } from "@/shared/ui/AppPage";
import { AppSurface } from "@/shared/ui/AppSurface";
import { AppPageHeader } from "@/shared/ui/PageHeader";

/** Platform administration: the audit log of every organization and of the platform itself. */
export function AdminAuditLogPage() {
  return (
    <AppPage>
      <AppSurface className="flex min-h-0 flex-1 flex-col gap-6 overflow-hidden">
        <AppPageHeader
          title="Audit log"
          description="Who did what and when, in every organization and on the platform itself: sign-ins, accounts, infrastructure and the system's background work. Entries are kept for 7 days by default."
        />
        <PlatformAuditLog />
      </AppSurface>
    </AppPage>
  );
}
