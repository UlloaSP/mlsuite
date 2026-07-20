export const searchKeys = {
  results: (organizationId: number | string, query: string) =>
    ["org", organizationId, "search", query] as const,
};
