import { Database, TrendingUp } from "lucide-react";
import { motion } from "motion/react";
import type { ModelDto } from "../api/modelService";

const getModelIcon = (type: string) => {
    switch (type) {
        case "classifier":
            return Database
        case "regressor":
            return TrendingUp
    }
}

const getStatusColor = (status: string) => {
    switch (status) {
        case "active":
            return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
        case "training":
            return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400"
        case "inactive":
            return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400"
        default:
            return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400"
    }
}

interface ModelCardProps {
    item: ModelDto;
    index: number;
    selectedItemId: string | null;
    onItemSelect: (modelId: string) => void;
}

export function ModelCard({ item, index, selectedItemId, onItemSelect }: ModelCardProps) {
    const Icon = getModelIcon(item.type)
    const isSelected = selectedItemId === item.id
    return (
        <motion.button
            key={item.id}
            onClick={() => onItemSelect(item.id)}
            className={`items-start text-left p-4 rounded-xl border transition-all grid grid-cols-[2fr_12fr_2fr] duration-300 ${isSelected
                ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700 shadow-md"
                : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                }`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1, duration: 0.3 }}
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
        >
            {/* Icon Section */}
            <div
                className={`flex items-left p-2 max-w-fit rounded-lg ${isSelected ? "bg-blue-100 dark:bg-blue-800" : "bg-gray-200 dark:bg-gray-700"}`}
            >
                {Icon && (
                    <Icon
                        size={16}
                        className={isSelected ? "text-blue-600 dark:text-blue-400" : "text-gray-600 dark:text-gray-400"} />
                )}
            </div>
            {/* Info Section */}
            <div className="">
                <h3 className="font-semibold text-gray-900 dark:text-white text-sm truncate">{item.name}</h3>

                <div className="flex flex-col text-xs gap-y-2 text-gray-600 dark:text-gray-400">
                    <span className="capitalize">{item.type}</span>

                    <div className="flex flex-col text-xs text-gray-500 dark:text-gray-500 font-mono truncate">
                        <span>Estimator: {item.specificType}</span>
                        <span>Created At: {new Date(item.createdAt).toLocaleDateString()}</span>
                        <span>{item.fileName}</span>
                    </div>
                </div>
            </div>
            {/* Status Section */}
            <div className="flex flex-col justify-between items-center">
                <span className={`p-2 text-xs justify-center w-fit rounded-md ${getStatusColor("active")}`}>
                    {"active"}
                </span>
            </div>
        </motion.button>
    );
}