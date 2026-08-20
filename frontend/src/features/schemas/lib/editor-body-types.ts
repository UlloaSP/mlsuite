import type { Monaco, OnMount, OnValidate } from "@monaco-editor/react";

export type MonacoNamespace = Monaco;
export type MonacoJson = Pick<typeof import("monaco-editor"), "json">;
export type MonacoEditorInstance = Parameters<OnMount>[0];
export type MonacoMarker = Parameters<OnValidate>[0][number];
export type MonacoMarkerData = Parameters<Monaco["editor"]["setModelMarkers"]>[2][number];
