export const infrastructureKeys = {
  all: ["adminInfrastructure"] as const,
  alerts: ["adminSystemAlerts"] as const,
  logs: (serviceName: string | null) => ["adminInfrastructureLogs", serviceName] as const,
};
