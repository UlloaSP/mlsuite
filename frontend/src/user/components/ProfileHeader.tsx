import { motion } from "motion/react";

export type ProfileHeaderProps = {
	imageUrl: string;
	name: string;
	provider: string;
};

export function ProfileHeader({
	imageUrl,
	name,
	provider,
}: ProfileHeaderProps) {
	return (
		<motion.div
			initial={{ scale: 0.9 }}
			animate={{ scale: 1 }}
			transition={{ delay: 0.3 }}
			className="flex-1 self-center justify-self-center text-center mb-8"
		>
			<motion.div className="relative inline-block">
				<motion.img
					src={imageUrl}
					alt="Profile"
					className="w-32 h-32 rounded-full mx-auto mb-4 border-4 border-purple-200 dark:border-purple-700"
					referrerPolicy="no-referrer"
				/>
				<motion.div
					className="absolute -bottom-2 -right-2 w-8 h-8 bg-green-500 rounded-full border-4 border-white dark:border-gray-800"
					initial={{ scale: 0 }}
					animate={{ scale: 1 }}
					transition={{ delay: 0.5, type: "spring" }}
				/>
			</motion.div>
			<motion.h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
				{name}
			</motion.h1>
			<motion.p className="text-gray-600 dark:text-gray-300">
				{provider}
			</motion.p>
		</motion.div>
	);
}
