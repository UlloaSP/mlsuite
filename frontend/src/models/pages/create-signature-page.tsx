/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { motion } from "motion/react";
import { AppPage, AppSurface } from "../../app/components";
import { Unauthorized } from "../../app/pages/Unauthorized.tsx";
import { EditorWrapper } from "../../editor/components/EditorWrapper.tsx";
import { useUser } from "../../user/hooks.ts";
import { CreateSignatureActionSection } from "../components/CreateSignatureActionSection.tsx";
import { CreateSignatureHeader } from "../components/CreateSignatureHeader.tsx";

export function CreateSignaturePage() {

	const { data: user, error } = useUser();
	if (!user || error) return <Unauthorized />;
	return (
		<AppPage>
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.5 }}
				className="flex flex-1"
			>
				<AppSurface className="flex flex-1 min-h-0 flex-col gap-6 overflow-hidden">
					<motion.div className="space-y-6">
						<CreateSignatureHeader />
						<CreateSignatureActionSection />
					</motion.div>
					<div className="flex min-h-0 flex-1 overflow-hidden">
						<EditorWrapper />
					</div>
				</AppSurface>
			</motion.div>
		</AppPage>
	);
}
