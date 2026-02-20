/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { motion } from "motion/react";

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
		<div className="w-full h-full bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
			<motion.div
				initial={{ y: 20, opacity: 0 }}
				animate={{ y: 0, opacity: 1 }}
				transition={{ delay: 0.15 }}
				className="text-center space-y-6 px-6 py-12"
			>
				<motion.h1
					className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-white tracking-tight"
					initial={{ scale: 0.98 }}
					animate={{ scale: 1 }}
					transition={{ delay: 0.2 }}
				>
					ML Suite
				</motion.h1>

				<motion.p
					className="text-lg md:text-xl text-gray-700 dark:text-gray-300 max-w-3xl mx-auto"
					initial={{ y: 16, opacity: 0 }}
					animate={{ y: 0, opacity: 1 }}
					transition={{ delay: 0.28 }}
				>
					A comprehensive ML platform that organizes your workflow, versions models, and ensures reproducible predictions with human review.
				</motion.p>

				<motion.div
					className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6 mt-10"
					initial={{ y: 24, opacity: 0 }}
					animate={{ y: 0, opacity: 1 }}
					transition={{ delay: 0.35 }}
				>
					{FEATURES.map((f, _) => (
						<motion.div
							key={f.title}
							className="bg-white/80 dark:bg-gray-800/80 backdrop-blur p-6 rounded-2xl shadow-lg text-left border border-gray-100 dark:border-gray-700"
							whileHover={{ scale: 1.03, y: -4 }}
							transition={{ duration: 0.18 }}
						>
							<div className="w-10 h-10 rounded-lg bg-indigo-500/10 dark:bg-indigo-400/10 mb-4 flex items-center justify-center">
								<div className="w-4 h-4 rounded bg-indigo-500 dark:bg-indigo-400" />
							</div>
							<h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
								{f.title}
							</h3>
							<p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
								{f.desc}
							</p>
						</motion.div>
					))}
				</motion.div>
			</motion.div>
		</div>
	);
}
