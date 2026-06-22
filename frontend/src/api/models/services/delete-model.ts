/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "../../core/services/app-fetch";

export const deleteModel = async (id: string): Promise<void> => {
  await appFetch(`/api/models/${encodeURIComponent(id)}`, { method: "DELETE" });
};
