/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useMemo } from "react";
import { SchemaRunReportRenderer } from "@/capabilities/prediction-runtime/reports/SchemaRunReportRenderer";
import { publicRunDisplayReports } from "@/features/explore/lib/public-run-display";
import { usePublicPluginCatalog } from "@/features/explore/lib/use-public-plugin-catalog";
import { AppCopy } from "@/shared/ui/AppCopy";
import type { PublicBookmarkDto, PublicRunDto } from "@/shared/api/openapi.gen";

type Props = {
  publicId: string;
  formSchema: PublicBookmarkDto["formSchema"];
  run: Pick<PublicRunDto, "reports">;
};

/** A kept run's results, drawn as the run drew them: one card per report that answered. */
export function PublicRunReports({ publicId, formSchema, run }: Props) {
  const reports = useMemo(() => publicRunDisplayReports(formSchema, run), [formSchema, run]);
  const catalog = usePublicPluginCatalog(publicId, formSchema);
  if (reports.length === 0) return <AppCopy>This run returned no results.</AppCopy>;
  if (catalog.failed) return <AppCopy>The results of this run could not be loaded.</AppCopy>;
  if (!catalog.ready) return <AppCopy>Loading results…</AppCopy>;
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {reports.map(({ key, report, result }) => (
        <SchemaRunReportRenderer
          key={key}
          result={result}
          report={report}
          customReportDefinitions={catalog.plugins?.reportDefinitions}
        />
      ))}
    </div>
  );
}
