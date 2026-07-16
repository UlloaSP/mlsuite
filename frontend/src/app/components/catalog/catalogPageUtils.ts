export const getCatalogErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : error ? "Unexpected catalog error." : null;

export const getCatalogTotalPages = (totalItems: number, pageSize: number) =>
  Math.max(1, Math.ceil(totalItems / pageSize));
