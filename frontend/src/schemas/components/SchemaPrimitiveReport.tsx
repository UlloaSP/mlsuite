/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useEffect, useMemo, useRef } from "react";
import {
  primitiveStaticText,
  primitiveTagNames,
  type PrimitiveRegistry,
  type PrimitiveReportController,
  type PrimitiveSubmitResult,
  type ReportDescriptor,
} from "mlform/primitives";
import type { ReportConfig } from "mlform/runtime";

type Props = {
  descriptor: ReportDescriptor;
  registry: PrimitiveRegistry;
  reportId: string;
  kind: string;
  label: string;
  payload: unknown;
  lastResult: PrimitiveSubmitResult;
  config?: ReportConfig;
};

export function SchemaPrimitiveReport({
  descriptor,
  registry,
  reportId,
  kind,
  label,
  payload,
  lastResult,
  config,
}: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const controller = useMemo<PrimitiveReportController>(
    () => ({
      id: reportId,
      kind,
      config: { ...config, label },
      state: { payload, error: null, status: "ready" },
      fetch: async () => payload,
      subscribe: () => () => {},
    }),
    [config, kind, label, payload, reportId],
  );

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const frame = document.createElement(primitiveTagNames.reportFrame) as HTMLElement & {
      controller?: PrimitiveReportController;
      descriptor?: ReportDescriptor;
      registry?: PrimitiveRegistry;
      text?: typeof primitiveStaticText;
      lastResult?: PrimitiveSubmitResult;
    };
    frame.controller = controller;
    frame.descriptor = descriptor;
    frame.registry = registry;
    frame.text = primitiveStaticText;
    frame.lastResult = lastResult;
    host.replaceChildren(frame);
    return () => host.replaceChildren();
  }, [controller, descriptor, lastResult, registry]);

  return <div ref={hostRef} />;
}
