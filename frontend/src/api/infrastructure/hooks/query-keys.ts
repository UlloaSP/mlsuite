/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

export const INFRASTRUCTURE_QUERY_KEY = ["adminInfrastructure"];
export const INFRASTRUCTURE_LOGS_QUERY_KEY = (serviceName: string | null) => ["adminInfrastructureLogs", serviceName] as const;
