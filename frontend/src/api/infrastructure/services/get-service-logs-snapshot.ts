/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "@/api/core/services/app-fetch";
import type { ServiceLogsSnapshotDto } from "@/api/infrastructure/dtos";

export const getServiceLogsSnapshot = (serviceName: string, tail = 200) =>
  appFetch<ServiceLogsSnapshotDto>(
    `/api/admin/infrastructure/services/${serviceName}/logs?tail=${tail}`,
  );
