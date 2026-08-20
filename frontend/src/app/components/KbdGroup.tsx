import type { ComponentProps } from "react";
import { cx } from "@/shared/ui/cx";

export function KbdGroup({ className, ...props }: ComponentProps<"span">) {
  return <span {...props} className={cx("inline-flex items-center gap-1", className)} />;
}
