import { AlertCircle, CheckCircle, Clock, Target, XCircle } from "lucide-react";
import { motion } from "motion/react";
import type { Prediction } from "../hooks";


const getStatusIcon = (status: string) => {
    switch (status) {
        case "correct":
            return CheckCircle
        case "incorrect":
            return XCircle
        case "pending":
            return AlertCircle
        default:
            return AlertCircle
    }
}

const getStatusColor = (status: string) => {
    switch (status) {
        case "correct":
            return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
        case "incorrect":
            return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
        case "pending":
            return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400"
        default:
            return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400"
    }
}

const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return "text-green-600 dark:text-green-400"
    if (confidence >= 0.7) return "text-yellow-600 dark:text-yellow-400"
    return "text-red-600 dark:text-red-400"
}


type PredictionCardProps = {
    item: Prediction;
    index: number;
    selectedItemId: string | null;
    onItemSelect: (predictionId: string) => void;
}

export function PredictionCard({ item, index, selectedItemId, onItemSelect }: PredictionCardProps) {
    const isSelected = selectedItemId === item.id
    const StatusIcon = getStatusIcon(item.status)

    return (
        <motion.button
            key={item.id}
            onClick={() => onItemSelect(item.id)}
            className={`grid grid-cols-[3fr_16fr_5fr] items-start text-left p-4 overflow-hidden rounded-xl border transition-all duration-300 ${isSelected
                ? "bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-700 shadow-md"
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
                className={`flex items-left p-2 max-w-fit rounded-lg ${isSelected ? "bg-purple-100 dark:bg-purple-800" : "bg-gray-200 dark:bg-gray-700"}`}
            >
                <Target
                    size={16}
                    className={
                        isSelected ? "text-purple-600 dark:text-purple-400" : "text-gray-600 dark:text-gray-400"
                    }
                />
            </div>
            {/* Info Section */}

            <div className="space-y-2">
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                    Output:{" "}
                    <span className={`font-mono ${item.status === "correct"
                        ? "text-green-500"
                        : item.status === "incorrect"
                            ? "text-red-500"
                            : "text-yellow-500"}`}>
                        {typeof item.output === "number"
                            ? item.output.toLocaleString()
                            : item.output}
                    </span>
                </div>

                <div className="flex items-start gap-3 text-xs">
                    <span className="text-gray-500 dark:text-gray-500">Confidence:</span>
                    <span className={`font-mono font-medium ${getConfidenceColor(item.confidence)}`}>
                        {(item.confidence * 100).toFixed(1)}%
                    </span>
                </div>

                <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-500">
                    <Clock size={12} />
                    <span>{new Date(item.timestamp).toLocaleString()}</span>
                </div>

                <div className="text-xs text-gray-500 dark:text-gray-500">
                    {Object.keys(item.inputs).length} inputs •{" "}
                    {(item.executionTime * 1000).toFixed(1)}ms
                </div>

                {item.status === "incorrect" && item.actualValue && (
                    <div className="flex items-center gap-1">
                        <span className="text-xs">{"Actual: "}</span>
                        <div className="text-xs text-green-600 dark:text-green-400">
                            {typeof item.actualValue === "number"
                                ? item.actualValue.toLocaleString()
                                : item.actualValue}
                        </div>
                    </div>
                )}
            </div>

            {/* Prediction Status */}


            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                        <StatusIcon
                            size={14}
                            className={
                                item.status === "correct"
                                    ? "text-green-500"
                                    : item.status === "incorrect"
                                        ? "text-red-500"
                                        : "text-yellow-500"
                            }
                        />
                        <span
                            className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(item.status)}`}
                        >
                            {item.status}
                        </span>
                    </div>
                </div>



            </div>
        </motion.button>
    )
}