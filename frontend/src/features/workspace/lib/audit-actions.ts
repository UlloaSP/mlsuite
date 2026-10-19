/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { enumLabel } from "@/shared/ui/AppBadge";

type AuditAction = {
  label: string;
  /** Taken by a platform administrator from the superadmin pages, not by a member. */
  platform?: boolean;
};

/** The action codes the API records, in the order the filter offers them. */
export const AUDIT_ACTIONS: Record<string, AuditAction> = {
  INVITATION_CREATE: { label: "Invitation sent" },
  INVITATION_RESEND: { label: "Invitation resent" },
  INVITATION_REVOKE: { label: "Invitation revoked" },
  ROLE_CREATE: { label: "Role created" },
  ROLE_FROM_TEMPLATE: { label: "Role created from a template" },
  ROLE_DUPLICATE: { label: "Role duplicated" },
  ROLE_UPDATE: { label: "Role updated" },
  ROLE_DELETE: { label: "Role deleted" },
  API_CLIENT_CREATE: { label: "API client created" },
  API_CLIENT_UPDATE: { label: "API client updated" },
  API_CLIENT_DELETE: { label: "API client deleted" },
  API_KEY_ISSUE: { label: "API key issued" },
  API_KEY_REVOKE: { label: "API key revoked" },
  API_ACCESS_GRANT: { label: "Bookmark access granted" },
  API_ACCESS_REVOKE: { label: "Bookmark access revoked" },
  API_CLIENT_SUSPEND: { label: "API client suspended", platform: true },
  API_CLIENT_REINSTATE: { label: "API client reinstated", platform: true },
  API_CALL_LIMIT_SET: { label: "Monthly API call limit set", platform: true },
  BOOKMARK_MODERATION_UNPUBLISH: { label: "Bookmark unpublished by moderation", platform: true },
};

const TARGET_TYPES: Record<string, string> = {
  INVITATION: "Invitation",
  ROLE: "Role",
  API_CLIENT: "API client",
  API_CLIENT_KEY: "API key",
  ORGANIZATION: "Organization",
  SCHEMA_BOOKMARK: "Bookmark",
};

/** A code this build does not know yet still reads as words. */
export const auditActionLabel = (action: string) =>
  AUDIT_ACTIONS[action]?.label ?? enumLabel(action);

export const isPlatformAction = (action: string) => Boolean(AUDIT_ACTIONS[action]?.platform);

export const auditTargetLabel = (targetType: string) =>
  TARGET_TYPES[targetType] ?? enumLabel(targetType);
