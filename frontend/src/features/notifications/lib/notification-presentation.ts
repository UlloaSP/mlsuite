import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  CircleX,
  UserRoundCheck,
  UserRoundX,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { NotificationDto } from "@/shared/api/openapi.gen";
import { formatMeasure } from "@/shared/lib/format-measure";
import { SECTION_ICONS } from "@/shared/ui/section-icons";
import type { NotificationKind } from "@/features/notifications/api/notifications.api";

export type NotificationTone = "success" | "warning" | "danger" | "info";

type Presentation = {
  title: string;
  description: string;
  icon: LucideIcon;
  tone: NotificationTone;
};

type Labels = NotificationDto["payload"];

/** A label of the payload as text; the server writes strings and numbers only. */
const label = (labels: Labels, key: string): string => {
  const value = labels[key];
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
};

const rows = (labels: Labels) =>
  `${label(labels, "doneRows")} of ${label(labels, "totalRows")} rows ran`;

const measure = (labels: Labels, amount: unknown) =>
  formatMeasure(Number(amount), String(labels.unit));

const alertCrossed = (labels: Labels) =>
  labels.unit === ""
    ? "It has held long enough to raise an alert."
    : `At ${measure(labels, labels.value)}, past the ${measure(labels, labels.threshold)} threshold.`;

/** A notification draws from its own payload, so it survives what it describes. */
const PRESENT: Record<NotificationKind, (labels: Labels) => Presentation> = {
  PREDICTION_JOB_COMPLETED: (labels) => ({
    title: "Bulk upload finished",
    description: `${label(labels, "bookmarkName")}: ${rows(labels)}.`,
    icon: CheckCircle2,
    tone: "success",
  }),
  PREDICTION_JOB_COMPLETED_WITH_FAILURES: (labels) => ({
    title: "Bulk upload finished with failed rows",
    description: `${label(labels, "bookmarkName")}: ${rows(labels)}, ${label(labels, "failedRows")} failed.`,
    icon: AlertTriangle,
    tone: "warning",
  }),
  PREDICTION_JOB_STOPPED: (labels) => ({
    title: "Bulk upload stopped",
    description: `${label(labels, "bookmarkName")}: ${label(labels, "reason")}. ${rows(labels)}.`,
    icon: CircleX,
    tone: "danger",
  }),
  PREDICTION_JOB_CANCELLED: (labels) => ({
    title: "Bulk upload cancelled",
    description: `${label(labels, "actorName")} cancelled it on ${label(labels, "bookmarkName")}. ${rows(labels)}.`,
    icon: Ban,
    tone: "warning",
  }),
  MODEL_READY: (labels) => ({
    title: "Model ready",
    description: `${label(labels, "modelName")} can run predictions.`,
    icon: CheckCircle2,
    tone: "success",
  }),
  MODEL_FAILED: (labels) => ({
    title: "Model could not be prepared",
    description: `${label(labels, "modelName")}: ${label(labels, "reason")}`,
    icon: CircleX,
    tone: "danger",
  }),
  INVITATION_RECEIVED: (labels) => ({
    title: `Invitation to ${label(labels, "organizationName")}`,
    description: `${label(labels, "inviterName")} invited you as ${label(labels, "roleName")}.`,
    icon: SECTION_ICONS.organizations,
    tone: "info",
  }),
  INVITATION_ACCEPTED: (labels) => ({
    title: "Invitation accepted",
    description: `${label(labels, "inviteeName")} joined ${label(labels, "organizationName")}.`,
    icon: UserRoundCheck,
    tone: "success",
  }),
  INVITATION_DECLINED: (labels) => ({
    title: "Invitation declined",
    description: `${label(labels, "inviteeName")} declined to join ${label(labels, "organizationName")}.`,
    icon: UserRoundX,
    tone: "warning",
  }),
  ORGANIZATION_JOINED: (labels) => ({
    title: `Added to ${label(labels, "organizationName")}`,
    description: `${label(labels, "inviterName")} added you as ${label(labels, "roleName")}.`,
    icon: SECTION_ICONS.organizations,
    tone: "info",
  }),
  REVIEW_ASSIGNED: (labels) => ({
    title: "Review assigned",
    description: `${label(labels, "assignerName")} asked you to review runs of ${label(labels, "schemaName")}.`,
    icon: SECTION_ICONS.reviews,
    tone: "info",
  }),
  REVIEW_REOPENED: (labels) => ({
    title: "Review reopened",
    description: `${label(labels, "actorName")} reopened ${label(labels, "runName")} in ${label(labels, "schemaName")} for you to review again.`,
    icon: SECTION_ICONS.reviews,
    tone: "info",
  }),
  ORGANIZATION_PURGED: (labels) => ({
    title: `${label(labels, "organizationName")} was deleted`,
    description: "A platform administrator deleted this organization and everything in it.",
    icon: SECTION_ICONS.organizations,
    tone: "warning",
  }),
  PURGE_COMPLETED: (labels) => ({
    title: "Purge completed",
    description: `${label(labels, "targetLabel")} and everything that depended on it are gone.`,
    icon: SECTION_ICONS.purges,
    tone: "success",
  }),
  PURGE_FAILED: (labels) => ({
    title: "Purge failed",
    description: `${label(labels, "targetLabel")}: ${label(labels, "reason")}`,
    icon: CircleX,
    tone: "danger",
  }),
  SYSTEM_ALERT_RAISED: (labels) => ({
    title: `Platform alert: ${label(labels, "label")}`,
    description: alertCrossed(labels),
    icon: AlertTriangle,
    tone: labels.severity === "CRITICAL" ? "danger" : "warning",
  }),
  SYSTEM_ALERT_ESCALATED: (labels) => ({
    title: `Alert now critical: ${label(labels, "label")}`,
    description: alertCrossed(labels),
    icon: AlertTriangle,
    tone: "danger",
  }),
  SYSTEM_ALERT_RESOLVED: (labels) => ({
    title: `Alert resolved: ${label(labels, "label")}`,
    description:
      labels.unit === ""
        ? "It is back to normal."
        : `Back to ${measure(labels, labels.value)}, under ${measure(labels, labels.threshold)}.`,
    icon: CheckCircle2,
    tone: "success",
  }),
};

export const presentNotification = (notification: NotificationDto) =>
  PRESENT[notification.kind](notification.payload);

/** Where a notification leads; an invitation received is answered in the inbox itself. */
export const notificationLink = (notification: NotificationDto): string | null => {
  switch (notification.targetType) {
    case "PREDICTION_JOB":
      return `/predict/${label(notification.payload, "bookmarkId")}?bulk=open`;
    case "MODEL":
      return `/models/${notification.targetId}`;
    case "REVIEW":
      return notification.kind === "REVIEW_REOPENED"
        ? `/review/${notification.targetId}/runs/${label(notification.payload, "reviewRunId")}`
        : `/review/${notification.targetId}`;
    case "ORGANIZATION":
      return "/home";
    case "PURGE_JOB":
      return "/admin/purges";
    case "SYSTEM_ALERT":
      return "/admin/infrastructure?tab=alerts";
    case "INVITATION":
      return notification.kind === "INVITATION_RECEIVED"
        ? null
        : `/workspace/organizations/${notification.organizationId}/invitations`;
  }
};
