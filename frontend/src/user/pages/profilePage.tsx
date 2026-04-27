/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { motion } from "motion/react";
import { AppPage, AppSurface } from "../../app/components";
import { NotFoundError } from "../../app/pages/error-page";
import { ProfileBody } from "../components/ProfileBody";
import { ProfileHeader } from "../components/ProfileHeader";
import { useUser } from "../hooks"; // Adjust the import path as necessary

export function ProfilePage() {
  const { data: user, isError } = useUser();

  if (!user || isError) return <NotFoundError />;

  return (
    <AppPage>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-1"
      >
        <AppSurface className="flex flex-1 flex-col overflow-auto app-scroll">
          <ProfileHeader
            imageUrl={user?.avatarUrl || ""}
            name={user?.userName || user?.fullName || "Guest"}
            provider={user ? "Local MLSuite account" : "Not logged in"}
          />
          <ProfileBody user={user} />
        </AppSurface>
      </motion.div>
    </AppPage>
  );
}
