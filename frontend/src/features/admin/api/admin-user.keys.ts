export const adminUserKeys = {
  all: ["adminUsers"] as const,
  page: (page: number, search: string, sort: string, role: string) =>
    ["adminUsers", page, search, sort, role] as const,
};
