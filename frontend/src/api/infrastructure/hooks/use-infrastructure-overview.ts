/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useQuery } from "@tanstack/react-query";
import { infrastructureOverviewQueryOptions } from "@/api/infrastructure/infrastructure-queries";

export function useInfrastructureOverview() {
  return useQuery(infrastructureOverviewQueryOptions());
}
