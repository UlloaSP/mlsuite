/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useQuery } from "@tanstack/react-query";
import { getServiceLogsSnapshot } from "../services";

export function useServiceLogsSnapshot(serviceName: string | null) {
  return useQuery({
    queryKey: ["adminInfrastructureLogs", serviceName],
    queryFn: () => getServiceLogsSnapshot(serviceName ?? ""),
    enabled: Boolean(serviceName),
    refetchInterval: 5000,
  });
}
