/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { motion } from "motion/react";
import {
	AppBadge,
	AppCopy,
	AppEyebrow,
	AppPage,
	AppPanel,
	AppSurface,
	AppTitle,
} from "../components";

type Feature = {
	title: string;
	desc: string;
};

const FEATURES: Feature[] = [
	{
		title: "Model Registry",
		desc: "Upload models, attach metadata, and keep a single source of truth for operational use.",
	},
	{
		title: "Signature Management",
		desc: "Generate input signatures automatically (MLSchema), refine them, and version them for reproducibility.",
	},
	{
		title: "Dynamic Forms",
		desc: "Render signatures as validated UI forms (MLForm) to collect inputs consistently and at low cost.",
	},
	{
		title: "Reproducible Predictions",
		desc: "Enforce the signature contract so every inference is deterministic, auditable, and repeatable.",
	},
	{
		title: "Prediction History",
		desc: "Persist all requests and responses with timestamps to guarantee end-to-end traceability.",
	},
	{
		title: "Human Review",
		desc: "Review outcomes, mark correct/incorrect, and capture ground truth to close the feedback loop.",
	},
	{
		title: "Batch & CSV Export",
		desc: "Export predictions and reviews as CSV for analytics, reporting, and downstream training.",
	},
	{
		title: "Analyzer Service",
		desc: "A private backend façade for secure model execution behind the API boundary.",
	},
	{
		title: "Developer Tooling",
		desc: "Open-source libraries (MLSchema, MLForm) and clean APIs to integrate with existing stacks.",
	},
];

export function HomePage() {
	return (
		<AppPage >
			<AppSurface className="flex flex-1 flex-col overflow-hidden">
				<motion.div
					initial={{ y: 20, opacity: 0 }}
					animate={{ y: 0, opacity: 1 }}
					transition={{ delay: 0.15 }}
					className="space-y-6 px-2 py-4 md:px-4 md:py-6"
				>
					<div className="space-y-4">
						<AppEyebrow>ML Operations Suite</AppEyebrow>
						<div className="flex flex-wrap items-center gap-3">
							<AppTitle>ML Suite</AppTitle>
							<AppBadge tone="accent">Platform</AppBadge>
						</div>
						<AppCopy className="max-w-3xl text-base md:text-lg">
							A cohesive ML workspace for model registration, signature authoring,
							reproducible prediction flows, human review, and explanation plugins.
						</AppCopy>
					</div>

					<motion.div
						className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3"
						initial={{ y: 24, opacity: 0 }}
						animate={{ y: 0, opacity: 1 }}
						transition={{ delay: 0.35 }}
					>
						{FEATURES.map((f, index) => (
							<motion.div
								key={f.title}
								whileHover={{ y: -4 }}
								transition={{ duration: 0.18 }}
							>
								<AppPanel className="h-full space-y-4">
									<div className="flex items-center justify-between">
										<div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--accent-quiet)]">
											<div className="h-4 w-4 rounded-full bg-[var(--accent-primary)]" />
										</div>
										<AppBadge tone="neutral">{String(index + 1).padStart(2, "0")}</AppBadge>
									</div>
									<h3 className="text-xl font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
										{f.title}
									</h3>
									<AppCopy>{f.desc}</AppCopy>
								</AppPanel>
							</motion.div>
						))}
					</motion.div>
				</motion.div>
			</AppSurface>
		</AppPage>
	);
}
