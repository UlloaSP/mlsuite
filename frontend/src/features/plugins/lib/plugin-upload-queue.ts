/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { inspectPluginSource } from "@/capabilities/prediction-runtime/sandbox/plugin-sandbox-services";
import type { PluginType } from "@/capabilities/prediction-runtime/sandbox/sandbox-protocol";

export const PLUGIN_FILE_EXTENSION = ".ts";

/**
 * checking → ready | invalid; ready → uploading → uploaded | failed; failed → uploading.
 * Only a validated file can be uploaded, so the catalog never receives a plugin the runtime rejects.
 */
export type PluginUploadStatus =
  | "checking"
  | "ready"
  | "invalid"
  | "uploading"
  | "uploaded"
  | "failed";

export type PluginUploadItem = {
  id: number;
  file: File;
  status: PluginUploadStatus;
  pluginType?: PluginType;
  kind?: string;
  error?: string;
};

export const pluginErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

/**
 * Reads and validates one file with the check the catalog applies when loading plugins: compiled
 * and run in the plugin sandbox, never in the app.
 */
export async function inspectPluginFile(
  file: File,
): Promise<Pick<PluginUploadItem, "status" | "pluginType" | "kind" | "error">> {
  if (!file.name.toLowerCase().endsWith(PLUGIN_FILE_EXTENSION)) {
    return {
      status: "invalid",
      error: `Only ${PLUGIN_FILE_EXTENSION} plugin files are supported.`,
    };
  }
  try {
    const detected = await inspectPluginSource({ fileName: file.name, source: await file.text() });
    return { status: "ready", pluginType: detected.pluginType, kind: detected.kind };
  } catch (error: unknown) {
    return { status: "invalid", error: pluginErrorMessage(error) };
  }
}

export const isUploadable = (item: PluginUploadItem) =>
  item.status === "ready" || item.status === "failed";
