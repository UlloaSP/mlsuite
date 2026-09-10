import { appFetch } from "@/shared/api/http";

export type StartupDependencyDto = {
  name: string;
  ready: boolean;
  message: string;
};

export type StartupReadinessDto = {
  ready: boolean;
  dependencies: StartupDependencyDto[];
};

export async function getStartupReadiness(signal?: AbortSignal): Promise<StartupReadinessDto> {
  return readServerReadiness(signal);
}

async function readServerReadiness(signal?: AbortSignal): Promise<StartupReadinessDto> {
  try {
    return await appFetch<StartupReadinessDto>("/api/readiness", { signal });
  } catch {
    if (signal?.aborted) throw signal.reason;
    return {
      ready: false,
      dependencies: [{ name: "api", ready: false, message: "unavailable" }],
    };
  }
}
