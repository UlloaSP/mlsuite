export type SearchResultType =
  | "organization"
  | "team"
  | "model"
  | "schema"
  | "snapshot"
  | "bookmark"
  | "predictionRun"
  | "plugin";

export interface SearchResult {
  type: SearchResultType;
  id: string;
  title: string;
  subtitle: string;
  href: string;
  organizationId?: number | null;
  teamId?: number | null;
  modelId?: number | null;
}

export interface SearchGroup {
  label: string;
  results: SearchResult[];
}

export interface SearchResponse {
  query: string;
  groups: SearchGroup[];
}
