/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "../../core/services/app-fetch";
import type { PluginPageDto, PluginPageRequest } from "../dtos";

export const getPluginPage = async ({
  page,
  search = "",
  size,
  sort = "updated",
  type = "all",
}: PluginPageRequest): Promise<PluginPageDto> => {
  const params = new URLSearchParams({
    page: String(page),
    search,
    size: String(size),
    sort,
    type,
  });
  return appFetch<PluginPageDto>(`/api/plugins?${params.toString()}`);
};
