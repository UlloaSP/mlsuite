/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "@/shared/api/http";
import type { PluginDto } from "@/api/plugins/dtos";

export const uploadPlugin = async (file: File): Promise<PluginDto> => {
  const formData = new FormData();
  formData.append("file", file);
  return appFetch<PluginDto>("/api/plugins", {
    method: "POST",
    body: formData,
  });
};
