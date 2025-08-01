import { CheckCircle, Edit3, Save, X, XCircle } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import { useState } from "react"

interface Prediction {
    id: string
    timestamp: string
    inputs: Record<string, any>
    output: any
    confidence: number
    status: "correct" | "incorrect" | "pending"
    actualValue?: any
    executionTime: number
}

interface PredictionDetailPanelProps {
    prediction: Prediction | null
    isVisible: boolean
    onClose: () => void
    onUpdateFeedback: (predictionId: string, isCorrect: boolean, actualValue?: any) => void
}

export function PredictionDetailPanel({
    prediction,
    isVisible,
    onClose,
    onUpdateFeedback,
}: PredictionDetailPanelProps) {
    const [feedbackState, setFeedbackState] = useState<"correct" | "incorrect" | null>(null)
    const [actualValue, setActualValue] = useState("")
    const [isEditing, setIsEditing] = useState(false)

    if (!prediction) return null

    const handleFeedbackSubmit = () => {
        if (feedbackState !== null) {
            onUpdateFeedback(
                prediction.id,
                feedbackState === "correct",
                feedbackState === "incorrect" ? actualValue : undefined,
            )
            setIsEditing(false)
        }
    }

    const formatInputValue = (value: any) => {
        if (typeof value === "number") {
            return value.toLocaleString()
        }
        return String(value)
    }

    const getOutputColor = () => {
        if (prediction.status === "correct") return "text-green-600 dark:text-green-400"
        if (prediction.status === "incorrect") return "text-red-600 dark:text-red-400"
        return "text-yellow-600 dark:text-yellow-400"
    }

    return (
        <AnimatePresence>
            {isVisible && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
                        onClick={onClose}
                    />

                    {/* Panel */}
                    <motion.div
                        initial={{ x: "100%", opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: "100%", opacity: 0 }}
                        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                        className="fixed right-0 top-0 h-full w-96 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 shadow-2xl z-50 flex flex-col"
                    >
                        {/* Header */}
                        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Prediction Details</h2>
                                <button
                                    onClick={onClose}
                                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                                >
                                    <X size={20} className="text-gray-500 dark:text-gray-400" />
                                </button>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {/* Prediction Info */}
                            <div className="space-y-4">
                                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
                                    <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Prediction Result</h3>
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-gray-600 dark:text-gray-400">Output:</span>
                                            <span className={`font-mono font-medium ${getOutputColor()}`}>
                                                {typeof prediction.output === "number" ? prediction.output.toLocaleString() : prediction.output}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-gray-600 dark:text-gray-400">Confidence:</span>
                                            <span className="font-mono font-medium text-gray-900 dark:text-white">
                                                {(prediction.confidence * 100).toFixed(1)}%
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-gray-600 dark:text-gray-400">Execution Time:</span>
                                            <span className="font-mono font-medium text-gray-900 dark:text-white">
                                                {(prediction.executionTime * 1000).toFixed(1)}ms
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-gray-600 dark:text-gray-400">Timestamp:</span>
                                            <span className="font-mono text-sm text-gray-900 dark:text-white">
                                                {new Date(prediction.timestamp).toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Input Features */}
                            <div className="space-y-4">
                                <h3 className="font-semibold text-gray-900 dark:text-white">Input Features</h3>
                                <div className="space-y-3">
                                    {Object.entries(prediction.inputs).map(([key, value]) => (
                                        <div key={key} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{key}:</span>
                                                <span className="font-mono text-sm text-gray-900 dark:text-white">
                                                    {formatInputValue(value)}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Feedback Section */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="font-semibold text-gray-900 dark:text-white">Prediction Feedback</h3>
                                    {prediction.status !== "pending" && !isEditing && (
                                        <button
                                            onClick={() => setIsEditing(true)}
                                            className="flex items-center space-x-1 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                                        >
                                            <Edit3 size={14} />
                                            <span>Edit</span>
                                        </button>
                                    )}
                                </div>

                                {prediction.status === "pending" || isEditing ? (
                                    <div className="space-y-4">
                                        <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">¿Fue correcta esta predicción?</div>

                                        <div className="flex space-x-3">
                                            <motion.button
                                                onClick={() => setFeedbackState("correct")}
                                                className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-lg border transition-all duration-200 ${feedbackState === "correct"
                                                    ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700 text-green-700 dark:text-green-400"
                                                    : "border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                                                    }`}
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                            >
                                                <CheckCircle size={18} />
                                                <span>Sí</span>
                                            </motion.button>

                                            <motion.button
                                                onClick={() => setFeedbackState("incorrect")}
                                                className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-lg border transition-all duration-200 ${feedbackState === "incorrect"
                                                    ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700 text-red-700 dark:text-red-400"
                                                    : "border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                                                    }`}
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                            >
                                                <XCircle size={18} />
                                                <span>No</span>
                                            </motion.button>
                                        </div>

                                        <AnimatePresence>
                                            {feedbackState === "incorrect" && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: "auto", opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    transition={{ duration: 0.3 }}
                                                    className="overflow-hidden"
                                                >
                                                    <div className="space-y-3">
                                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                                            Valor correcto:
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={actualValue}
                                                            onChange={(e) => setActualValue(e.target.value)}
                                                            placeholder="Introduce el valor correcto..."
                                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                        />
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>

                                        {feedbackState && (
                                            <motion.button
                                                onClick={handleFeedbackSubmit}
                                                className="w-full flex items-center justify-center space-x-2 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                            >
                                                <Save size={18} />
                                                <span>Guardar Feedback</span>
                                            </motion.button>
                                        )}
                                    </div>
                                ) : (
                                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                                        <div className="flex items-center space-x-2 mb-2">
                                            {prediction.status === "correct" ? (
                                                <CheckCircle size={16} className="text-green-500" />
                                            ) : (
                                                <XCircle size={16} className="text-red-500" />
                                            )}
                                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                                                {prediction.status === "correct" ? "Predicción correcta" : "Predicción incorrecta"}
                                            </span>
                                        </div>
                                        {prediction.status === "incorrect" && prediction.actualValue && (
                                            <div className="text-sm text-gray-600 dark:text-gray-400">
                                                Valor correcto:{" "}
                                                <span className="font-mono text-gray-900 dark:text-white">{prediction.actualValue}</span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}
