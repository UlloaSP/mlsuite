import { appFetch } from "@/api/core/services";

export type StartupDependencyDto = {
  name: string;
  ready: boolean;
  message: string;
};

export type StartupReadinessDto = {
  ready: boolean;
  dependencies: StartupDependencyDto[];
};

export async function getStartupReadiness(): Promise<StartupReadinessDto> {
  return readServerReadiness();
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
