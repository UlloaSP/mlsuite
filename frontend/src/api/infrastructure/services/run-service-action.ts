/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "@/shared/api/http";
import { json } from "@/shared/api/http";
import type { ServiceAction } from "@/api/infrastructure/dtos";

export const runServiceAction = (serviceName: string, action: ServiceAction) =>
  appFetch<void>(
    `/api/admin/infrastructure/services/${serviceName}/actions`,
    json("POST", { action }),
  );
