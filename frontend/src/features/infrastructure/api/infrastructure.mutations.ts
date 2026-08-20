import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createTerminalSession, runServiceAction } from "./infrastructure.api";
import { infrastructureKeys } from "./infrastructure.keys";
import type { ServiceAction } from "./infrastructure.types";

export const useServiceAction = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ serviceName, action }: { serviceName: string; action: ServiceAction }) =>
      runServiceAction(serviceName, action),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: infrastructureKeys.all }),
  });
};

export const useTerminalSession = () => {
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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: infrastructureKeys.all }),
  });
};
