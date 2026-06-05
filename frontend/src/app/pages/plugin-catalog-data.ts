/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { PluginDto } from "../api/pluginService";
import { detectPluginType } from "../utils/mlform/plugin-catalog";
import type { PluginPageItem } from "./plugin-catalog-shared";

export const enrichPlugin = async (item: PluginDto): Promise<PluginPageItem> => {
  try {
    const detected = await detectPluginType(item.source);
    return {
      ...item,
      kind: detected.kind,
      pluginType: detected.pluginType,
      uniqueKey: `${detected.pluginType}:${item.id}`,
    };
  } catch {
    return { ...item, kind: null, pluginType: "invalid", uniqueKey: `invalid:${item.id}` };
  }
};
