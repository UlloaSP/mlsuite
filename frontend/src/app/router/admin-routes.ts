/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import {
  adminPublicBookmarksSearch,
  adminPurgesSearch,
  adminUsersSearch,
} from "@/features/admin/pages/admin-search";
import { apiTrafficSearch } from "@/features/api-access/pages/api-access-search";
import { infrastructureSearch } from "@/features/infrastructure/pages/infrastructure-search";
import { auditSearch } from "@/features/workspace/pages/workspace-search";
import { superadminRoute } from "./layout-routes";
import { page, searchPage } from "./lazy-route";

/** The platform's own pages, for superadmins. */
export const superadminRoutes = superadminRoute.addChildren([
  searchPage(superadminRoute, "admin/users", adminUsersSearch, () =>
    import("@/features/admin/pages/admin-users-page").then((m) => m.AdminUsersPage),
  ),
  page(superadminRoute, "admin/users/create", () =>
    import("@/features/admin/pages/create-admin-user-page").then((m) => m.CreateAdminUserPage),
  ),
  searchPage(superadminRoute, "admin/purges", adminPurgesSearch, () =>
    import("@/features/admin/pages/admin-purges-page").then((m) => m.AdminPurgesPage),
  ),
  searchPage(superadminRoute, "admin/public-bookmarks", adminPublicBookmarksSearch, () =>
    import("@/features/admin/pages/admin-public-bookmarks-page").then(
      (m) => m.AdminPublicBookmarksPage,
    ),
  ),
  searchPage(superadminRoute, "admin/api-traffic", apiTrafficSearch, () =>
    import("@/features/api-access/pages/admin-api-traffic-page").then(
      (m) => m.AdminApiTrafficPage,
    ),
  ),
  searchPage(superadminRoute, "admin/audit", auditSearch, () =>
    import("@/features/workspace/pages/admin-audit-log-page").then((m) => m.AdminAuditLogPage),
  ),
  searchPage(superadminRoute, "admin/infrastructure", infrastructureSearch, () =>
    import("@/features/infrastructure/pages/admin-infrastructure-page").then(
      (m) => m.AdminInfrastructurePage,
    ),
  ),
]);
