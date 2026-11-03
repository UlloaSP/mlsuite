import { mutationOptions, useMutation } from "@tanstack/react-query";
import { createTerminalSession, runServiceAction } from "./infrastructure.api";
import { infrastructureKeys } from "./infrastructure.keys";
import type { ServiceAction } from "./infrastructure.types";

const serviceActionMutation = mutationOptions({
  mutationFn: ({ serviceName, action }: { serviceName: string; action: ServiceAction }) =>
    runServiceAction(serviceName, action),
  onSuccess: (_data, _variables, _result, { client }) =>
    client.invalidateQueries({ queryKey: infrastructureKeys.all }),
});

const terminalSessionMutation = mutationOptions({
  mutationFn: ({ serviceName, cols, rows }: { serviceName: string; cols: number; rows: number }) =>
    createTerminalSession(serviceName, cols, rows),
  onSuccess: (_session, _variables, _result, { client }) =>
    client.invalidateQueries({ queryKey: infrastructureKeys.all }),
});

export const useServiceAction = () => useMutation(serviceActionMutation);

export const useTerminalSession = () => useMutation(terminalSessionMutation);
