/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

/** Compose service states reported by ops-agent through the frontend server. */
export type StartupServiceState =
  | "waiting"
  | "created"
  | "starting"
  | "checking"
  | "healthy"
  | "running"
  | "completed"
  | "unhealthy"
  | "restarting"
  | "exited";

export type StartupServicesDto = { services: { state: StartupServiceState }[] };

// Same origin as the page: the frontend server proxies this route to ops-agent, which is
// up before spring-app. Failures resolve to null so the gate keeps polling.
export async function getStartupServices(
  signal?: AbortSignal,
): Promise<StartupServiceState[] | null> {
  try {
    const response = await fetch("/startup/services", { signal });
    if (!response.ok) return null;
    const body = (await response.json()) as StartupServicesDto;
    return body.services.map((service) => service.state);
  } catch {
    if (signal?.aborted) throw signal.reason;
    return null;
  }
}
