/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useEffect, useRef, useState } from "react";
import { AppCopy } from "@/shared/ui/AppCopy";
import { AppLoadingState } from "@/shared/ui/AppLoadingState";
import { AppPanel } from "@/shared/ui/AppPanel";
import { cx } from "@/shared/ui/cx";
import { getBackendBaseUrl } from "@/shared/config/runtime";
import type { SchemaDisplayReport } from "@/capabilities/prediction-runtime/data/report-display";
import { openPluginSandbox } from "@/capabilities/prediction-runtime/sandbox/plugin-sandbox";
import type {
  PluginCatalogEntry,
  SandboxReportView,
} from "@/capabilities/prediction-runtime/sandbox/sandbox-protocol";
import type { PredictionResultDto } from "@/shared/api/openapi.gen";

type Props = {
  result: Pick<PredictionResultDto, "modelId" | "modelInput" | "output">;
  report: SchemaDisplayReport;
  plugin: PluginCatalogEntry;
};

type State = { status: "loading" | "ready" | "empty" } | { status: "failed"; message: string };

/**
 * A saved report drawn by its plugin, in a plugin sandbox as tall as what it draws. The frame is
 * drawn again only when the report, its result or the plugin change.
 */
export function SandboxedReport({ result, report, plugin }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<State>({ status: "loading" });
  const view = JSON.stringify({
    kind: "report",
    report,
    result: { modelId: result.modelId, modelInput: result.modelInput, output: result.output },
    plugin,
    backendUrl: getBackendBaseUrl(),
  } satisfies SandboxReportView);

  useEffect(() => {
    if (!containerRef.current) return;
    setState({ status: "loading" });
    const sandbox = openPluginSandbox({
      container: containerRef.current,
      title: `${report.label} report`,
      sizing: "content",
    });
    sandbox.mount(JSON.parse(view) as SandboxReportView).then(
      ({ rendered }) => setState({ status: rendered ? "ready" : "empty" }),
      (error: Error) => setState({ status: "failed", message: error.message }),
    );
    return () => sandbox.destroy();
  }, [report.label, view]);

  return (
    <div>
      {state.status === "loading" ? <AppLoadingState compact label="Loading report…" /> : null}
      {state.status === "empty" ? (
        <AppPanel>
          <AppCopy>No renderable report content returned.</AppCopy>
        </AppPanel>
      ) : null}
      {state.status === "failed" ? (
        <AppPanel>
          <AppCopy>This report could not be drawn. {state.message}</AppCopy>
        </AppPanel>
      ) : null}
      <div
        ref={containerRef}
        className={cx((state.status === "empty" || state.status === "failed") && "hidden")}
      />
    </div>
  );
}
