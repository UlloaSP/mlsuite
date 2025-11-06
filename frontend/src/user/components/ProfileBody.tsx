/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useAtom } from "jotai";
import {
	Calendar,
	Fullscreen,
	Languages,
	Mail,
	MapPin,
	Plane,
	SunMoon,
	User,
} from "lucide-react";
import { motion } from "motion/react";
import { fullscreenAtom, themeAtom } from "../../app/atoms";
import type { UserDTO } from "../api/userService";
import { InfoCard } from "./InfoCard";

export type ProfileBodyProps = {
	user: UserDTO;
};

export function ProfileBody({ user }: ProfileBodyProps) {
	const [theme] = useAtom(themeAtom);
	const [screen] = useAtom(fullscreenAtom);

	return (
		<motion.div
			initial={{ y: 30, opacity: 0 }}
			animate={{ y: 0, opacity: 1 }}
			transition={{ delay: 0.4 }}
			className="space-y-6"
		>
			<motion.div className="grid grid-cols-2 gap-6">
				<InfoCard
					icon={Mail}
					title="Email"
					value={user?.email || "Not provided"}
				/>
				<InfoCard
					icon={Calendar}
					title="Joined"
					value={user?.createdAt || "Not provided"}
				/>
				<InfoCard
					icon={MapPin}
					title="Location"
					value={user?.location || "Not provided"}
				/>
				<InfoCard
					icon={User}
					title="Name"
					value={user?.fullName || "Not provided"}
				/>
				<InfoCard
					icon={Languages}
					title="Culture"
					value={window.navigator.language || "Not provided"}
				/>
				<InfoCard
					icon={Plane}
					title="Time Zone"
					value={
						Intl.DateTimeFormat().resolvedOptions().timeZone || "Not provided"
					}
				/>
				<InfoCard
					icon={SunMoon}
					title="Theme"
					value={theme || "Not Provided"}
				/>
				<InfoCard
					icon={Fullscreen}
					title="Screen"
					value={screen ? "Fullscreen" : "Windowed"}
				/>
			</motion.div>
		</motion.div>
	);
}
