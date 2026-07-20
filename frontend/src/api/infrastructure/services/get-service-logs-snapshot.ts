/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "@/shared/api/http";
import type { ServiceLogsSnapshotDto } from "@/api/infrastructure/dtos";

export const getServiceLogsSnapshot = (serviceName: string, tail = 200, signal?: AbortSignal) =>
  appFetch<ServiceLogsSnapshotDto>(
    `/api/admin/infrastructure/services/${serviceName}/logs?tail=${tail}`,
    { signal },
  );
