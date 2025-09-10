import { motion } from "motion/react";
import type { PredictionDto } from "../api/modelService";
import { ColumnActionButton } from "./ColumnActionButton";
import { ExportButton } from "./ExportButton";
type PredColumnHeaderProps = {
    title: string;
    onClick: () => void | Promise<void>;
    items: PredictionDto[];
};

export function PredColumnHeader({ title, onClick, items }: PredColumnHeaderProps) {
    return (
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                {title}
            </h2>
            <motion.div className="flex flex-row gap-2">
                <ColumnActionButton onClick={onClick}></ColumnActionButton>
                <ExportButton predictions={items} />
            </motion.div>
        </div>
    );
}
