/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { motion } from "motion/react";
import { Unauthorized } from "../../app/pages/Unauthorized";
import { ProfileBody } from "../components/ProfileBody";
import { ProfileHeader } from "../components/ProfileHeader";
import { useUser } from "../hooks"; // Adjust the import path as necessary

export function ProfilePage() {
	const { data: user, isError } = useUser();

	if (!user || isError) return <Unauthorized />;

	return (
		<motion.div className="flex flex-1 size-full overflow-hidden bg-gradient-to-br from-slate-50 via-yellow-50 to-amber-50 dark:from-gray-900 dark:via-slate-800 dark:to-amber-900">
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.5 }}
				className="flex flex-col flex-1 overflow-hidden m-12 p-12 bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-md shadow-2xl border border-white/20 dark:border-gray-700/20"
			>
				<ProfileHeader
					imageUrl={user?.avatarUrl}
					name={user?.userName || user?.fullName || "Guest"}
					provider={
						user
							? `Logged in with ${user.oauthProvider.charAt(0).toUpperCase() + user.oauthProvider.slice(1)}`
							: "Not logged in"
					}
				/>
				<ProfileBody user={user} />
			</motion.div>
		</motion.div>
	);
}
