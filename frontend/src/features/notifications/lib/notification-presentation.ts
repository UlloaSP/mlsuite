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

const rows = (labels: Labels) => `${labels.doneRows} of ${labels.totalRows} rows ran`;

/** A notification draws from its own payload, so it survives what it describes. */
const PRESENT: Record<NotificationKind, (labels: Labels) => Presentation> = {
  PREDICTION_JOB_COMPLETED: (labels) => ({
    title: "Bulk upload finished",
    description: `${labels.bookmarkName}: ${rows(labels)}.`,
    icon: CheckCircle2,
    tone: "success",
  }),
  PREDICTION_JOB_COMPLETED_WITH_FAILURES: (labels) => ({
    title: "Bulk upload finished with failed rows",
    description: `${labels.bookmarkName}: ${rows(labels)}, ${labels.failedRows} failed.`,
    icon: AlertTriangle,
    tone: "warning",
  }),
  PREDICTION_JOB_STOPPED: (labels) => ({
    title: "Bulk upload stopped",
    description: `${labels.bookmarkName}: ${labels.reason}. ${rows(labels)}.`,
    icon: CircleX,
    tone: "danger",
  }),
  PREDICTION_JOB_CANCELLED: (labels) => ({
    title: "Bulk upload cancelled",
    description: `${labels.actorName} cancelled it on ${labels.bookmarkName}. ${rows(labels)}.`,
    icon: Ban,
    tone: "warning",
  }),
  MODEL_READY: (labels) => ({
    title: "Model ready",
    description: `${labels.modelName} can run predictions.`,
    icon: CheckCircle2,
    tone: "success",
  }),
  MODEL_FAILED: (labels) => ({
    title: "Model could not be prepared",
    description: `${labels.modelName}: ${labels.reason}`,
    icon: CircleX,
    tone: "danger",
  }),
  INVITATION_RECEIVED: (labels) => ({
    title: `Invitation to ${labels.organizationName}`,
    description: `${labels.inviterName} invited you as ${labels.roleName}.`,
    icon: SECTION_ICONS.organizations,
    tone: "info",
  }),
  INVITATION_ACCEPTED: (labels) => ({
    title: "Invitation accepted",
    description: `${labels.inviteeName} joined ${labels.organizationName}.`,
    icon: UserRoundCheck,
    tone: "success",
  }),
  INVITATION_DECLINED: (labels) => ({
    title: "Invitation declined",
    description: `${labels.inviteeName} declined to join ${labels.organizationName}.`,
    icon: UserRoundX,
    tone: "warning",
  }),
  ORGANIZATION_JOINED: (labels) => ({
    title: `Added to ${labels.organizationName}`,
    description: `${labels.inviterName} added you as ${labels.roleName}.`,
    icon: SECTION_ICONS.organizations,
    tone: "info",
  }),
  REVIEW_ASSIGNED: (labels) => ({
    title: "Review assigned",
    description: `${labels.assignerName} asked you to review runs of ${labels.schemaName}.`,
    icon: SECTION_ICONS.reviews,
    tone: "info",
  }),
  ORGANIZATION_PURGED: (labels) => ({
    title: `${labels.organizationName} was deleted`,
    description: "A platform administrator deleted this organization and everything in it.",
    icon: SECTION_ICONS.organizations,
    tone: "warning",
  }),
  PURGE_COMPLETED: (labels) => ({
    title: "Purge completed",
    description: `${labels.targetLabel} and everything that depended on it are gone.`,
    icon: SECTION_ICONS.purges,
    tone: "success",
  }),
  PURGE_FAILED: (labels) => ({
    title: "Purge failed",
    description: `${labels.targetLabel}: ${labels.reason}`,
    icon: CircleX,
    tone: "danger",
  }),
};

export const presentNotification = (notification: NotificationDto) =>
  PRESENT[notification.kind](notification.payload);

/** Where a notification leads; an invitation received is answered in the inbox itself. */
export const notificationLink = (notification: NotificationDto): string | null => {
  switch (notification.targetType) {
    case "PREDICTION_JOB":
      return `/predict/${notification.payload.bookmarkId}?bulk=open`;
    case "MODEL":
      return `/models/${notification.targetId}`;
    case "REVIEW":
      return `/review/${notification.targetId}`;
    case "ORGANIZATION":
      return "/home";
    case "PURGE_JOB":
      return "/admin/purges";
    case "INVITATION":
      return notification.kind === "INVITATION_RECEIVED"
        ? null
        : `/workspace/organizations/${notification.organizationId}/invitations`;
  }
};
