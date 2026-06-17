export type SearchResultType =
  | "organization"
  | "team"
  | "model"
  | "plugin";

export interface SearchResultDto {
  type: SearchResultType;
  id: string;
  title: string;
  subtitle: string;
  href: string;
  organizationId?: number | null;
  teamId?: number | null;
  modelId?: number | null;
}

export interface SearchGroupDto {
  label: string;
  results: SearchResultDto[];
}

export interface SearchResponseDto {
  query: string;
  groups: SearchGroupDto[];
}
