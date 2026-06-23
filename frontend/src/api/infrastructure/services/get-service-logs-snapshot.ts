/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "../../core/services/app-fetch";
import type { ServiceLogsSnapshotDto } from "../dtos";

export const getServiceLogsSnapshot = (serviceName: string, tail = 200) =>
  appFetch<ServiceLogsSnapshotDto>(
    `/api/admin/infrastructure/services/${serviceName}/logs?tail=${tail}`,
  );
