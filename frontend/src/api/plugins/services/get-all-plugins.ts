/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { PluginDto } from "../dtos";
import { getPluginPage } from "./get-plugin-page";

export const getAllPlugins = async (size = 100): Promise<PluginDto[]> => {
  const items: PluginDto[] = [];
  let page = 0;
  while (true) {
    const response = await getPluginPage({ page, size });
    items.push(...response.items);
    if (!response.hasNext) {
      return items;
    }
    page += 1;
  }
};
