import type { OnMount, OnValidate } from "@monaco-editor/react";

import type { MonacoNamespace } from "@/capabilities/editor/monaco";

export type { MonacoNamespace };
export type MonacoEditorInstance = Parameters<OnMount>[0];
export type MonacoMarker = Parameters<OnValidate>[0][number];
export type MonacoMarkerData = Parameters<MonacoNamespace["editor"]["setModelMarkers"]>[2][number];
