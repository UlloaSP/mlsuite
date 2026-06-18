import { appFetch } from "../../api/core/services";

export type StartupDependencyDto = {
  name: string;
  ready: boolean;
  message: string;
};

export type StartupReadinessDto = {
  ready: boolean;
  dependencies: StartupDependencyDto[];
};

let clientRuntimePromise: Promise<void> | null = null;

export async function getStartupReadiness(): Promise<StartupReadinessDto> {
  const [server, client] = await Promise.all([readServerReadiness(), readClientReadiness()]);
  const dependencies = [...server.dependencies, client];

  return {
    ready: server.ready && client.ready,
    dependencies,
  };
}

async function readServerReadiness(): Promise<StartupReadinessDto> {
  try {
    return await appFetch<StartupReadinessDto>("/api/readiness");
  } catch {
    return {
      ready: false,
      dependencies: [{ name: "api", ready: false, message: "unavailable" }],
    };
  }
}

async function readClientReadiness(): Promise<StartupDependencyDto> {
  try {
    await preloadClientRuntime();
    return { name: "client-runtime", ready: true, message: "ready" };
  } catch {
    return { name: "client-runtime", ready: false, message: "unavailable" };
  }
}

function preloadClientRuntime(): Promise<void> {
  clientRuntimePromise ??= Promise.all([
    import("typescript"),
    import("monaco-editor"),
    import("@monaco-editor/react"),
    import("mlform/runtime"),
    import("mlform/kit"),
    import("mlform/builtins"),
  ]).then(() => undefined);

  return clientRuntimePromise;
}
