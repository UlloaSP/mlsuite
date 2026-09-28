/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useInfrastructureOverview } from "@/features/infrastructure/api/infrastructure.queries";
import { AppBadge } from "@/shared/ui/AppBadge";
import { FactList } from "@/app/components/welcome/FactList";

const percent = (value: { percent: number | null; supported: boolean }) =>
  value.supported && value.percent !== null ? `${Math.round(value.percent)}%` : "—";

/** The platform's services right now: how many are up and how loaded they are. */
export function InfrastructureFacts() {
  const overview = useInfrastructureOverview().data;
  if (!overview) return null;
  const running = overview.services.filter((service) => service.status === "running").length;
  const unhealthy = overview.services.filter(
    (service) => service.health && service.health !== "healthy",
  );
  return (
    <FactList
      facts={[
        {
          label: "Services",
          value: (
            <>
              {running}/{overview.services.length} running
              {unhealthy.length > 0 ? (
                <>
                  {" "}
                  <AppBadge tone="danger">{unhealthy.length} unhealthy</AppBadge>
                </>
              ) : null}
            </>
          ),
        },
        { label: "CPU", value: percent(overview.aggregate.cpu) },
        { label: "Memory", value: percent(overview.aggregate.ram) },
      ]}
    />
  );
}
