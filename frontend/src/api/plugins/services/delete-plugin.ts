/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "../../core/services/app-fetch";

export const deletePlugin = async (id: string): Promise<void> => {
  await appFetch(`/api/plugins?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
};
