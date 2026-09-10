export type SystemRole = "USER" | "SUPERADMIN";

export type AdminUser = {
  id: number;
  username: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  systemRole: SystemRole;
  enabled: boolean;
  createdAt: string;
};

export type AdminUserPage = {
  items: AdminUser[];
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

export type AdminCreateUserPayload = {
  email: string;
  password: string;
  fullName: string;
  username?: string;
  systemRole?: SystemRole;
  enabled?: boolean;
};

export type AdminUpdateUserPayload = {
  username?: string;
  fullName?: string;
  systemRole?: SystemRole;
  enabled?: boolean;
};
