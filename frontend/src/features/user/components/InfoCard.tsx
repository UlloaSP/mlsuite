/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { LucideIcon } from "lucide-react";
import { AppEyebrow } from "@/shared/ui/AppEyebrow";
import { AppPanel } from "@/shared/ui/AppPanel";

export type InfoCardProps = {
  icon: LucideIcon;
  title: string;
  value: string | number;
};

export function InfoCard({ icon: Icon, title, value }: InfoCardProps) {
  return (
    <AppPanel className="h-full">
      <div className="flex items-center gap-x-3">
        <div className="flex size-11 items-center justify-center rounded-2xl bg-accent-subtle">
          <Icon className="text-accent" size={20} />
        </div>
        <div>
          <AppEyebrow>{title}</AppEyebrow>
          <p className="mt-0.5 font-medium text-fg">{value}</p>
        </div>
      </div>
    </AppPanel>
  );
}
