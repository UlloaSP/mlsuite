import { ClipboardCheck, Trash2 } from "lucide-react";
import { AppActionsMenu, type AppMenuAction } from "@/shared/ui/AppActionsMenu";

type Props = {
  canDelete: boolean;
  canManageReviews: boolean;
  disabled?: boolean;
  inferenceName: string;
  onDelete: () => void;
  onReviewStatus: () => void;
};

export function InferenceActionsMenu({
  canDelete,
  canManageReviews,
  disabled,
  inferenceName,
  onDelete,
  onReviewStatus,
}: Props) {
  const actions: AppMenuAction[] = [
    ...(canManageReviews
      ? [
          {
            key: "review-status",
            label: "Review status",
            icon: ClipboardCheck,
            onSelect: onReviewStatus,
          },
        ]
      : []),
    ...(canDelete
      ? [
          {
            key: "delete",
            label: "Delete",
            icon: Trash2,
            onSelect: onDelete,
            tone: "danger" as const,
          },
        ]
      : []),
  ];

  return (
    <AppActionsMenu
      label={`Open actions for ${inferenceName}`}
      actions={actions}
      disabled={disabled}
    />
  );
}
