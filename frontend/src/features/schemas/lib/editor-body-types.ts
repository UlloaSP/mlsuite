import type { OnMount, OnValidate } from "@monaco-editor/react";

export type MonacoNamespace = typeof import("monaco-editor");
export type MonacoJson = Pick<MonacoNamespace, "json">;
export type MonacoEditorInstance = Parameters<OnMount>[0];
export type MonacoMarker = Parameters<OnValidate>[0][number];
export type MonacoMarkerData = Parameters<MonacoNamespace["editor"]["setModelMarkers"]>[2][number];
