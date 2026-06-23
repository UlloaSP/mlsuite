/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "../../core/services/app-fetch";
import type { CreateModelRequest, CreateModelDto } from "../dtos";

/** ---------- services ---------- */
export const createModel = async ({
  name,
  modelFile,
  dataframeFile,
  oneHotSeparator = "__",
}: CreateModelRequest): Promise<CreateModelDto> => {
  const formData = new FormData();
  formData.append("name", name);
  formData.append("modelFile", modelFile);
  formData.append("oneHotSeparator", oneHotSeparator);
  if (dataframeFile) formData.append("dataframeFile", dataframeFile);

  // Browser sets multipart boundary; do not set Content-Type manually
  return appFetch<CreateModelDto>("/api/models", { method: "POST", body: formData });
};
