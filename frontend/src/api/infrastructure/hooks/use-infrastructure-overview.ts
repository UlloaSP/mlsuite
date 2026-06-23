/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useQuery } from "@tanstack/react-query";
import { getInfrastructureOverview } from "../services";
import { INFRASTRUCTURE_QUERY_KEY } from "./query-keys";

export function useInfrastructureOverview() {
  return useQuery({
    queryKey: INFRASTRUCTURE_QUERY_KEY,
    queryFn: getInfrastructureOverview,
    refetchInterval: 5000,
  });
}
