/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createTerminalSession } from "../services";
import { INFRASTRUCTURE_QUERY_KEY } from "./query-keys";

export function useTerminalSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      serviceName,
      cols,
      rows,
    }: {
      serviceName: string;
      cols: number;
      rows: number;
    }) => createTerminalSession(serviceName, cols, rows),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: INFRASTRUCTURE_QUERY_KEY,
      }),
  });
}
