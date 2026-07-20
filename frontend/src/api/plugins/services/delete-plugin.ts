/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "@/shared/api/http";

export const deletePlugin = async (id: string): Promise<void> => {
  await appFetch(`/api/plugins?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
};
