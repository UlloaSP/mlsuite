/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "@/shared/api/http";

export const deleteSchema = async (id: string): Promise<void> => {
  await appFetch(`/api/schemas/${encodeURIComponent(id)}`, { method: "DELETE" });
};
