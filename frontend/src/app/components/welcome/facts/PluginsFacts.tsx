/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useCurrentOrganizationId } from "@/capabilities/workspace-context/workspace-context";
import { usePluginCatalogStatsQuery } from "@/features/plugins/api/plugin.queries";
import { FactList } from "@/app/components/welcome/FactList";

/** The plugins installed in the organization, by what they extend. */
export function PluginsFacts() {
  const stats = usePluginCatalogStatsQuery(useCurrentOrganizationId()).data;
  if (!stats) return null;
  return (
    <FactList
      facts={[
        { label: "Plugins", value: stats.fieldPlugins + stats.reportPlugins },
        { label: "Input fields", value: stats.fieldPlugins },
        { label: "Reports", value: stats.reportPlugins },
      ]}
    />
  );
}
