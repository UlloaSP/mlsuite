import type { AdminUserDto } from "@/shared/api/openapi.gen";

export type SystemRole = AdminUserDto["systemRole"];

export const SYSTEM_ROLE_OPTIONS: Array<{ value: SystemRole; label: string }> = [
  { value: "USER", label: "User" },
  { value: "SUPERADMIN", label: "Superadmin" },
];

export type AdminUserPageRequest = {
  page: number;
  role: string;
  search: string;
  size: number;
  sort: string;
};
