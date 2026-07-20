/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useQuery } from "@tanstack/react-query";
import { serviceLogsQueryOptions } from "@/api/infrastructure/infrastructure-queries";

export function useServiceLogsSnapshot(serviceName: string | null) {
  return useQuery(serviceLogsQueryOptions(serviceName));
}
