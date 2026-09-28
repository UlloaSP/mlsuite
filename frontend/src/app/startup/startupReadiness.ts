import { appFetch } from "@/shared/api/http";
import type { StartupReadinessDto } from "@/shared/api/openapi.gen";

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
