/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { PluginCatalogStats } from "./PluginCatalogStats";
import { usePluginCatalogStatsQuery } from "../hooks/usePluginCatalogPageData";

type PluginCatalogStatsPanelProps = {
  organizationId: number | string | undefined;
};

export function PluginCatalogStatsPanel({ organizationId }: PluginCatalogStatsPanelProps) {
  const statsQuery = usePluginCatalogStatsQuery(organizationId);
  const fieldPlugins = statsQuery.data?.fieldPlugins ?? 0;
  const reportPlugins = statsQuery.data?.reportPlugins ?? 0;

  return (
    <PluginCatalogStats
      fieldPlugins={fieldPlugins}
      reportPlugins={reportPlugins}
      totalPlugins={fieldPlugins + reportPlugins}
    />
  );
}
