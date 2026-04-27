/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { LucideIcon } from "lucide-react";
import { motion } from "motion/react";
import { AppCopy, AppPanel } from "../../app/components";

export type InfoCardProps = {
  icon: LucideIcon;
  title: string;
  value: string | number;
};

export function InfoCard({ icon: Icon, title, value }: InfoCardProps) {
  return (
    <motion.div whileHover={{ scale: 1.01, y: -2 }}>
      <AppPanel className="h-full">
        <motion.div className="flex items-center space-x-3">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-[var(--accent-quiet)]">
            <Icon className="text-[var(--accent-primary)]" size={20} />
          </div>
          <motion.div>
            <AppCopy className="text-xs uppercase tracking-[0.16em]">{title}</AppCopy>
            <motion.p className="font-medium text-[var(--text-primary)]">{value}</motion.p>
          </motion.div>
        </motion.div>
      </AppPanel>
    </motion.div>
  );
}
