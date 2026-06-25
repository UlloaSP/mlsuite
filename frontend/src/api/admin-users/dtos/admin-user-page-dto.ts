import type { AdminUserDto } from "./admin-user-dto";

export type AdminUserPageDto = {
  items: AdminUserDto[];
  totalItems: number;
  hasNext: boolean;
};

export type AdminUserPageRequest = {
  page: number;
  role: string;
  search: string;
  size: number;
  sort: string;
};
