/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { motion } from "motion/react";
import { Unauthorized } from "../../app/pages/Unauthorized.tsx";
import { EditorWrapper } from "../../editor/components/EditorWrapper.tsx";
import { useUser } from "../../user/hooks.ts";
import { CreateSignatureActionSection } from "../components/CreateSignatureActionSection.tsx";
import { CreateSignatureHeader } from "../components/CreateSignatureHeader.tsx";
import { CreateSignatureInfoSection } from "../components/CreateSignatureInfoSection.tsx";

export function CreateSignaturePage() {

	const { data: user, error } = useUser();
	if (!user || error) return <Unauthorized />;
	return (
		<motion.div className="flex flex-1 size-full overflow-hidden bg-gradient-to-br from-slate-50 via-green-50 to-emerald-50 dark:from-gray-900 dark:via-slate-800 dark:to-emerald-500">
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.5 }}
				className="flex flex-row flex-1 overflow-hidden m-12 p-12 bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-md shadow-2xl border border-white/20 dark:border-gray-700/20"
			>
				<motion.div className="flex flex-col flex-1">
					<CreateSignatureHeader />
					<motion.div className="flex-1 flex flex-row">
						<motion.div className="flex-1 flex overflow-hidden">
							<CreateSignatureInfoSection />
							<CreateSignatureActionSection />
						</motion.div>
					</motion.div>
				</motion.div>
				<EditorWrapper />
			</motion.div>
		</motion.div>
	);
}
