export const organizationQueryKey = (organizationId: number | string) =>
  ["org", organizationId] as const;
