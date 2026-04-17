/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { motion } from "motion/react";
import type { PredictionDto } from "../api/modelService";
import { ColumnActionButton } from "./ColumnActionButton";
import { ExportButton } from "./ExportButton";
import { AppBadge, AppEyebrow } from "../../app/components";
type PredColumnHeaderProps = {
    title: string;
    onClick: () => void | Promise<void>;
    items: PredictionDto[];
};

export function PredColumnHeader({ title, onClick, items }: PredColumnHeaderProps) {
    return (
        <div className="border-b border-[var(--border-soft)] p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                    <AppEyebrow className="mb-2">History</AppEyebrow>
                    <h2 className="text-2xl font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
                        {title}
                    </h2>
                </div>
                <AppBadge tone="neutral">{items.length}</AppBadge>
            </div>
            <motion.div className="flex flex-row gap-2">
                <ColumnActionButton onClick={onClick}></ColumnActionButton>
                <ExportButton predictions={items} />
            </motion.div>
        </div>
    );
}
