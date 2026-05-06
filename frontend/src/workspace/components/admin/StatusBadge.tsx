import { AppBadge } from "../../../app/components";

const tone = {
	ACTIVE: "success",
	INACTIVE: "neutral",
	ARCHIVED: "warning",
	PENDING: "warning",
	ACCEPTED: "success",
	EXPIRED: "neutral",
	REVOKED: "danger",
} as const;

export function StatusBadge({ value }: { value: keyof typeof tone | string }) {
	return <AppBadge tone={tone[value as keyof typeof tone] ?? "neutral"}>{value.toLowerCase()}</AppBadge>;
}
