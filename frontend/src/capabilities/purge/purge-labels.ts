import type { PurgeScope } from "./purge-api";

const COUNT_LABELS: Record<string, string> = {
  schemas: "Schemas",
  schemaVersions: "Snapshots",
  drafts: "Changes",
  bookmarks: "Bookmarks",
  models: "Models",
  plugins: "Plugins",
  runs: "Inferences",
  results: "Results",
  answers: "Answers",
  answerHistory: "Answer revisions",
  reviews: "Reviews",
  reviewRuns: "Inferences in reviews",
  reviewAssignees: "Reviewer assignments",
  reviewSubmissions: "Review submissions",
  predictionJobs: "Bulk uploads",
  predictionJobRows: "Bulk upload rows",
  predictionJobsCancelled: "Bulk uploads cancelled",
  memberships: "Memberships",
  invitations: "Invitations",
  roles: "Roles",
  apiClients: "API clients",
  apiCalls: "API calls logged",
  bindings: "Model bindings",
  examples: "Public examples",
  emptyOrganizations: "Empty organizations",
  anonymizedRuns: "Inferences made anonymous",
  anonymizedApiClients: "API clients made anonymous",
};

/** Only these say what the purge destroyed; the rest are the steps it took to get there. */
export const countLabel = (key: string) => COUNT_LABELS[key];

export const SCOPE_LABELS: Record<PurgeScope, string> = {
  ORGANIZATION: "Organization",
  USER: "User",
  SCHEMA: "Schema",
  MODEL: "Model",
};
