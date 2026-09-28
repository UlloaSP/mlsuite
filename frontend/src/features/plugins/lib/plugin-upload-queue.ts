/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import {
  detectPluginType,
  type DetectedPluginType,
} from "@/capabilities/prediction-runtime/plugins/plugin-catalog-loader";
import { readFileText } from "./catalog-page-model";

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
  pluginType?: DetectedPluginType;
  kind?: string;
  error?: string;
};

export const pluginErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

/** Reads and validates one file with the same runtime check the catalog applies when loading plugins. */
export async function inspectPluginFile(
  organizationId: number | string,
  file: File,
): Promise<Pick<PluginUploadItem, "status" | "pluginType" | "kind" | "error">> {
  if (!file.name.toLowerCase().endsWith(PLUGIN_FILE_EXTENSION)) {
    return {
      status: "invalid",
      error: `Only ${PLUGIN_FILE_EXTENSION} plugin files are supported.`,
    };
  }
  try {
    const detected = await detectPluginType(organizationId, await readFileText(file));
    return { status: "ready", pluginType: detected.pluginType, kind: detected.kind };
  } catch (error: unknown) {
    return { status: "invalid", error: pluginErrorMessage(error) };
  }
}

export const isUploadable = (item: PluginUploadItem) =>
  item.status === "ready" || item.status === "failed";
