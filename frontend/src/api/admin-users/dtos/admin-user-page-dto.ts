import type { AdminUserDto } from "./admin-user-dto";

export type AdminUserPageDto = {
  items: AdminUserDto[];
  totalItems: number;
  hasNext: boolean;
};
