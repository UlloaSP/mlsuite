export const getCatalogErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : error ? "Unexpected catalog error." : null;
