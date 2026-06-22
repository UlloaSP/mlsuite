/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { runServiceAction } from "../services";
import { INFRASTRUCTURE_QUERY_KEY } from "./query-keys";

export function useServiceAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      serviceName,
      action,
    }: {
      serviceName: string;
      action: "START" | "STOP" | "RESTART";
    }) => runServiceAction(serviceName, action),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: INFRASTRUCTURE_QUERY_KEY,
      }),
  });
}
