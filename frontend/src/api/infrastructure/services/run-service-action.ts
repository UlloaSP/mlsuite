/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "@/api/core/services/app-fetch";
import { json } from "@/api/core/services/json";
import type { ServiceAction } from "@/api/infrastructure/dtos";

export const runServiceAction = (serviceName: string, action: ServiceAction) =>
  appFetch<void>(
    `/api/admin/infrastructure/services/${serviceName}/actions`,
    json("POST", { action }),
  );
