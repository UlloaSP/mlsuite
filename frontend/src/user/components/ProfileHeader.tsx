/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { m as motion } from "motion/react";
import { AppBadge } from "../../app/components/ui-controls";
import { AppCopy, AppEyebrow } from "../../app/components/ui";

export type ProfileHeaderProps = {
  imageUrl: string | null;
  name: string;
  provider: string;
};

export function ProfileHeader({ imageUrl, name, provider }: ProfileHeaderProps) {
  return (
    <motion.div
      initial={{ scale: 0.9 }}
      animate={{ scale: 1 }}
      transition={{ delay: 0.3 }}
      className="mb-8 flex-1 self-center justify-self-center text-center"
    >
      <motion.div className="relative inline-block">
        {imageUrl ? (
          <motion.img
            src={imageUrl}
            alt="Profile"
            className="mx-auto mb-4 size-32 rounded-full border-4 border-[var(--surface-primary)] object-cover shadow-[var(--shadow-card)]"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="mx-auto mb-4 grid size-32 place-items-center rounded-full border-4 border-[var(--surface-primary)] bg-[var(--accent-quiet)] text-3xl font-semibold text-[var(--accent-primary-strong)] shadow-[var(--shadow-card)]">
            {name.slice(0, 2).toUpperCase()}
          </div>
        )}
        <motion.div
          className="absolute -bottom-2 -right-2 size-8 rounded-full border-4 border-[var(--surface-primary)] bg-[var(--accent-primary)]"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.5, type: "spring" }}
        />
      </motion.div>
      <AppEyebrow className="mb-3">Profile</AppEyebrow>
      <motion.h1 className="mb-2 text-3xl font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
        {name}
      </motion.h1>
      <AppCopy className="mb-3">{provider}</AppCopy>
      <AppBadge tone="accent">Workspace Identity</AppBadge>
    </motion.div>
  );
}
