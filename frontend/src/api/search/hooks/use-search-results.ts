/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useQuery } from "@tanstack/react-query";
import { searchWorkspace } from "../services";

export const useSearchResults = (query: string) =>
  useQuery({
    queryKey: ["search", query],
    queryFn: () => searchWorkspace(query),
    enabled: query.trim().length >= 2,
    staleTime: 30_000,
  });
