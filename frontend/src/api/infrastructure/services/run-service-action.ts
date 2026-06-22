/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "../../core/services/app-fetch";
import { json } from "../../core/services/json";
import type { ServiceAction } from "../dtos";

export const runServiceAction = (serviceName: string, action: ServiceAction) =>
  appFetch<void>(
    `/api/admin/infrastructure/services/${serviceName}/actions`,
    json("POST", { action }),
  );
