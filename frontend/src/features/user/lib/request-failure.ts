/** What to tell someone about a request that failed: the API's reason, when it gave one. */
export const requestFailure = (error: unknown) =>
  error instanceof Error ? error.message : "The request could not be completed.";
