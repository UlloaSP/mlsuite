/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import {
	CheckCircle,
	FileJson,
	GitGraph,
	Layers,
	Save,
	Type,
} from "lucide-react";
import { motion } from "motion/react";
import { BestPractices } from "./BestPractices";
import { Timeline } from "./Timeline";

const TIMELINE_NODES = [
	{ icon: Layers, label: "Select base version" },
	{ icon: Type, label: "Name the signature" },
	{ icon: GitGraph, label: "Version the signature" },
	{ icon: FileJson, label: "Edit JSON signature" },
	{ icon: CheckCircle, label: "Validate signature" },
	{ icon: Save, label: "Save signature" },
];

const BEST_PRACTICES_TITLE = "Schema Best Practices";
const BEST_PRACTICES = [
	"Ensure the JSON follows the schema.",
	"Use descriptive names for fields.",
	"Keep versioning consistent with semantic versioning.",
];

export function CreateSignatureInfoSection() {
	return (
		<motion.div className="flex flex-1 flex-col gap-8">
			<Timeline steps={TIMELINE_NODES} />
			<BestPractices title={BEST_PRACTICES_TITLE} practices={BEST_PRACTICES} />
		</motion.div>
	);
}
