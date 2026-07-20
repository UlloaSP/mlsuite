import type { ServiceStatusDto } from "@/features/infrastructure/api/infrastructure.types";

export type SortKey = "name" | "status" | "uptime" | "cpuPercent" | "memoryBytes";
export type SortDir = "asc" | "desc";
export type ServiceSort = { key: SortKey; dir: SortDir };

type Filters = {
  query: string;
  status: string;
  health: string;
  sort: ServiceSort;
};

export function filterAndSortServices(services: ServiceStatusDto[], filters: Filters) {
  const query = filters.query.toLowerCase();
  const direction = filters.sort.dir === "asc" ? 1 : -1;

  return services
    .filter((service) => {
      if (filters.status !== "all" && service.status !== filters.status) return false;
      if (filters.health === "healthy" && service.health !== "healthy") return false;
      if (filters.health === "degraded" && service.health !== "degraded") return false;
      if (filters.health === "unknown" && service.health != null) return false;
      return (
        !query ||
        service.name.toLowerCase().includes(query) ||
        (service.containerName ?? "").toLowerCase().includes(query)
      );
    })
    .sort((left, right) => {
      const leftValue = left[filters.sort.key];
      const rightValue = right[filters.sort.key];
      if (leftValue == null) return rightValue == null ? 0 : 1;
      if (rightValue == null) return -1;
      if (typeof leftValue === "number" && typeof rightValue === "number") {
        return (leftValue - rightValue) * direction;
      }
      return String(leftValue).localeCompare(String(rightValue)) * direction;
    });
}

export const serviceStatusCounts = (services: ServiceStatusDto[]) => ({
  all: services.length,
  running: services.filter((service) => service.status === "running").length,
  stopped: services.filter((service) => service.status === "exited" || service.status === "dead")
    .length,
  restarting: services.filter((service) => service.status === "restarting").length,
});
