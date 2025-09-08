import { AlertCircle, CheckCircle, Clock, Goal, LibraryBig, Target, XCircle, Zap } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import type { PredictionDto } from "../api/modelService";
import { useGetTargets } from "../hooks";

const getStatusIcon = (status: string) => {
    switch (status.toString()) {
        case "COMPLETED":
            return CheckCircle
        case "FAILED":
            return XCircle
        case "PENDING":
            return AlertCircle
        default:
            return AlertCircle
    }
}

const getStatusColor = (status: string) => {
    switch (status.toString()) {
        case "COMPLETED":
            return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
        case "FAILED":
            return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
        case "PENDING":
            return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400"
        default:
            return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400"
    }
}


type PredictionCardProps = {
    item: PredictionDto;
    index: number;
    selectedItemId: string | null;
    onItemSelect: (predictionId: string) => void;
}

export function PredictionCard({ item, index, selectedItemId, onItemSelect }: PredictionCardProps) {
    const [value, setValue] = useState<string>("");
    const isSelected = selectedItemId === item.id
    const StatusIcon = getStatusIcon(item.status.toString())

    const { data: targets = [] } = useGetTargets({ predictionId: item.id || "" });

    useEffect(() => {

        let outputs: any[] = [];
        // @ts-ignore
        if (item.prediction && Array.isArray(item.prediction.outputs)) {
            // @ts-ignore
            outputs = item.prediction.outputs;
        }

        if (outputs.length > 0 && outputs[0]?.type === "classifier") {
            const probabilities = outputs[0].probabilities ?? [];
            if (Array.isArray(probabilities) && probabilities.length > 0) {
                const maxProb = probabilities[0].reduce((max: number, current: number) => (current > max ? current : max), 0);
                setValue(maxProb);
            }
        } else if (outputs.length > 0 && outputs[0]?.type === "regressor") {
            const values = outputs[0].values ?? [];
            if (Array.isArray(values) && values.length > 0) {
                setValue(values.toString());
            }
        }
    }, [item, value]);

    const formatExecutionTime = (time: number) => {
        if (time < 1000) {
            return `${time.toFixed(2).toLocaleString()} ms`
        }
        if (time < 60000) {
            return `${(time / 1000).toFixed(2).toLocaleString()} s`
        }
        if (time < 3600000) {
            return `${(time / 60000).toFixed(2).toLocaleString()} min`
        }

        return `${(time / 3600000).toFixed(2).toLocaleString()} h`
    }

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
                <div className={`text-sm font-medium text-gray-900`}>
                    <span className={`${getStatusColor(item.status.toString()).replace(/bg-\S+/g, '').replace(/dark:bg-\S+/g, '')}`}>{item.name}</span>
                </div>

                <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-500">
                    <Clock size={12} />
                    <span>{new Date(item.createdAt).toLocaleString()}</span>
                </div>

                <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-500">
                    <Zap size={12} />
                    {/* @ts-ignore */}
                    <span>{formatExecutionTime(item.prediction.outputs[0].execution_time)}</span>
                </div>

                <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-500">
                    <LibraryBig size={12} />
                    <span>{`${(Object.keys(item.inputs).length).toLocaleString()} ${Object.keys(item.inputs).length > 1 ? "features" : "feature"}`}</span>
                </div>

                <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-500">
                    <Goal size={12} />
                    <span>{`${targets.length.toLocaleString()} ${targets.length > 1 ? "targets" : "target"}`}</span>
                </div>
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                        <StatusIcon
                            size={14}
                            className={`${getStatusColor(item.status.toString())}`}
                        />
                        <span
                            className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(item.status.toString())}`}
                        >
                            {item.status.toString().toLocaleLowerCase()}
                        </span>
                    </div>
                </div>



            </div>
        </motion.button>
    )
}