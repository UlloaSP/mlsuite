export const SCHEMA_REVIEW_CONTEXT_QUERY_KEY = (token: string) =>
  ["schemaReviewContext", { token }] as const;
export const SCHEMA_REVIEW_RUN_QUERY_KEY = (token: string, runToken: string) =>
  ["schemaReviewRun", { token, runToken }] as const;
