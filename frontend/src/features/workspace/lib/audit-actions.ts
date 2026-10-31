/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { enumLabel } from "@/shared/ui/AppBadge";
import type { AuditEventDto } from "@/shared/api/openapi.gen";

type AuditAction = AuditEventDto["action"];
type AuditActorKind = AuditEventDto["actor"]["kind"];
type AuditTargetType = AuditEventDto["targetType"];

type AuditActionCopy = {
  label: string;
  /** Taken by a platform administrator from the superadmin pages, not by a member. */
  platform?: boolean;
};

/**
 * The words for the API's action codes, in the order filters offer them. The codes are the API's:
 * one missing here, or no longer in the contract, does not compile.
 */
export const AUDIT_ACTIONS: Record<AuditAction, AuditActionCopy> = {
  ORGANIZATION_CREATE: { label: "Organization created" },
  ORGANIZATION_UPDATE: { label: "Organization updated" },
  ORGANIZATION_DELETE: { label: "Organization deleted" },
  ORGANIZATION_LOGO_REPLACE: { label: "Organization logo replaced" },
  ORGANIZATION_LOGO_REMOVE: { label: "Organization logo removed" },
  OWNERSHIP_TRANSFER: { label: "Ownership transferred" },
  MEMBER_ROLE_CHANGE: { label: "Member role changed" },
  MEMBER_REMOVE: { label: "Member removed" },
  INVITATION_CREATE: { label: "Invitation sent" },
  INVITATION_RESEND: { label: "Invitation resent" },
  INVITATION_REVOKE: { label: "Invitation revoked" },
  INVITATION_ACCEPT: { label: "Invitation accepted" },
  INVITATION_DECLINE: { label: "Invitation declined" },
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
  MODEL_UPLOAD: { label: "Model uploaded" },
  MODEL_RENAME: { label: "Model renamed" },
  MODEL_ARCHIVE: { label: "Model archived" },
  MODEL_RESTORE: { label: "Model restored" },
  MODEL_ENVIRONMENT_RETRY: { label: "Model environment retried" },
  MODEL_DUPLICATE: { label: "Model duplicated" },
  MODEL_DELETE: { label: "Model deleted" },
  MODEL_EXPLAIN: { label: "Model explained" },
  MODEL_PREPARATION_READY: { label: "Model ready" },
  MODEL_PREPARATION_FAILED: { label: "Model preparation failed" },
  SCHEMA_CREATE: { label: "Schema created" },
  SCHEMA_RENAME: { label: "Schema renamed" },
  SCHEMA_ARCHIVE: { label: "Schema archived" },
  SCHEMA_RESTORE: { label: "Schema restored" },
  SCHEMA_DUPLICATE: { label: "Schema duplicated" },
  SCHEMA_DELETE: { label: "Schema deleted" },
  SCHEMA_VERSION_CREATE: { label: "Schema snapshot created" },
  SCHEMA_DRAFT_CREATE: { label: "Schema draft created" },
  SCHEMA_DRAFT_UPDATE: { label: "Schema draft updated" },
  SCHEMA_DRAFT_MERGE: { label: "Schema draft merged" },
  SCHEMA_DRAFT_PUBLISH: { label: "Schema draft published" },
  BOOKMARK_CREATE: { label: "Bookmark created" },
  BOOKMARK_MOVE: { label: "Bookmark moved" },
  BOOKMARK_UPDATE: { label: "Bookmark updated" },
  BOOKMARK_PUBLISH: { label: "Bookmark published" },
  BOOKMARK_UNPUBLISH: { label: "Bookmark unpublished" },
  BOOKMARK_EXAMPLE_MARK: { label: "Run marked as an example" },
  BOOKMARK_EXAMPLE_UNMARK: { label: "Run unmarked as an example" },
  BOOKMARK_MODERATION_UNPUBLISH: { label: "Bookmark unpublished by moderation", platform: true },
  PREDICTION_RUN: { label: "Prediction run" },
  PREDICTION_RUN_SAVE: { label: "Prediction saved" },
  PREDICTION_RUN_BATCH_CREATE: { label: "Predictions saved in a batch" },
  PREDICTION_RUN_DELETE: { label: "Prediction deleted" },
  PREDICTION_JOB_START: { label: "Bulk upload started" },
  PREDICTION_JOB_CANCEL: { label: "Bulk upload cancelled" },
  PREDICTION_JOB_RETRY: { label: "Bulk upload retried" },
  PREDICTION_JOB_CLAIMED: { label: "Bulk upload picked up" },
  PREDICTION_JOB_COMPLETED: { label: "Bulk upload finished" },
  PREDICTION_JOB_CANCELLED: { label: "Bulk upload stopped after its cancellation" },
  REVIEW_CREATE: { label: "Review created" },
  REVIEW_FEEDBACK_CREATE: { label: "Review feedback given" },
  REVIEW_FEEDBACK_UPDATE: { label: "Review feedback changed" },
  REVIEW_SUBMIT: { label: "Review submitted" },
  REVIEW_SUBMIT_PENDING: { label: "Pending reviews submitted" },
  REVIEW_REOPEN: { label: "Review reopened" },
  REVIEW_RESPONSE_DELETE: { label: "Review response deleted" },
  PUBLIC_FEEDBACK_SAVE: { label: "Feedback given on a public page" },
  PLUGIN_UPLOAD: { label: "Plugin uploaded" },
  PLUGIN_DELETE: { label: "Plugin deleted" },
  USER_CREATE: { label: "User created" },
  USER_UPDATE: { label: "User updated" },
  USER_PASSWORD_RESET: { label: "User password reset" },
  USER_DELETE: { label: "User deleted" },
  INFRASTRUCTURE_SERVICE_ACTION: { label: "Infrastructure service action" },
  TERMINAL_SESSION_OPEN: { label: "Terminal session opened" },
  TERMINAL_SESSION_CLOSE: { label: "Terminal session closed" },
  AUTH_LOGIN: { label: "Signed in" },
  AUTH_LOGIN_FAILED: { label: "Sign-in failed" },
  AUTH_LOGOUT: { label: "Signed out" },
  AUTH_REGISTER: { label: "Account registered" },
  STORAGE_DELETION_FAILED: { label: "Storage deletion failed" },
  API_REQUEST_RETENTION_PRUNE: { label: "API calls pruned" },
  AUDIT_RETENTION_PRUNE: { label: "Audit entries pruned" },
};

export const AUDIT_TARGET_TYPES: Record<AuditTargetType, string> = {
  API_CLIENT: "API client",
  API_CLIENT_KEY: "API key",
  API_REQUEST_LOG: "API call log",
  AUDIT_LOG: "Audit log",
  INFRASTRUCTURE_SERVICE: "Service",
  INVITATION: "Invitation",
  MODEL: "Model",
  ORGANIZATION: "Organization",
  ORGANIZATION_MEMBER: "Member",
  PLUGIN: "Plugin",
  PREDICTION_JOB: "Bulk upload",
  PREDICTION_RUN: "Prediction",
  REVIEW: "Review",
  ROLE: "Role",
  SCHEMA: "Schema",
  SCHEMA_BOOKMARK: "Bookmark",
  SCHEMA_DRAFT: "Schema draft",
  SCHEMA_VERSION: "Schema snapshot",
  STORAGE_OBJECT: "Stored object",
  TERMINAL_SESSION: "Terminal session",
  USER: "User",
};

export const AUDIT_ACTOR_KINDS: Record<AuditActorKind, string> = {
  USER: "Person",
  SYSTEM: "System",
  API_CLIENT: "API client",
  VISITOR: "Public visitor",
};

/** A code this build does not know yet still reads as words. */
export const auditActionLabel = (action: string) =>
  AUDIT_ACTIONS[action as AuditAction]?.label ?? enumLabel(action);

export const isPlatformAction = (action: string) =>
  Boolean(AUDIT_ACTIONS[action as AuditAction]?.platform);

export const auditTargetLabel = (targetType: string) =>
  AUDIT_TARGET_TYPES[targetType as AuditTargetType] ?? enumLabel(targetType);

const detailLabel = (key: string) => {
  const words = key.replace(/([A-Z])/g, " $1").toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
};

const isChange = (value: unknown): value is { from?: unknown; to?: unknown } =>
  typeof value === "object" && value !== null && ("from" in value || "to" in value);

const detailValue = (value: unknown) =>
  isChange(value) ? `${String(value.from ?? "—")} → ${String(value.to ?? "—")}` : String(value);

/** What an entry recorded, as it reads: an entry written before details had names shows its text. */
export const auditDetails = (metadata: AuditEventDto["metadata"]) =>
  Object.entries(metadata ?? {})
    .map(([key, value]) =>
      key === "detail" ? String(value) : `${detailLabel(key)}: ${detailValue(value)}`,
    )
    .join(" · ");
