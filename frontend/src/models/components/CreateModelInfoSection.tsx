/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import {
    Save,
    Table2,
    Type,
    UploadCloud
} from "lucide-react";
import { motion } from "motion/react";
import { BestPractices } from "./BestPractices";
import { Timeline } from "./Timeline";

const TIMELINE_NODES = [
    { icon: UploadCloud, label: "Upload model file" },
    { icon: Table2, label: "Attach dataframe (optional)" },
    { icon: Type, label: "Model name auto-filled" },
    { icon: Save, label: "Save model" },
];

const BEST_PRACTICES_TITLE = "Upload Best Practices";
const BEST_PRACTICES = [
    "Ensure the file is under 100MB.",
    "Version your model before uploading.",
    "Provide the final feature set in the optional dataframe."
];

export function CreateModelInfoSection() {
    return (
        <motion.div className="flex flex-1 flex-col justify-between gap-8">
            <Timeline steps={TIMELINE_NODES} />
            <BestPractices title={BEST_PRACTICES_TITLE} practices={BEST_PRACTICES} />
        </motion.div>
    );
}