import { motion } from "framer-motion"
import { Database, FileText } from "lucide-react"

interface AnalyzerHeaderProps {
    modelFile: File | null
    dataFile: File | null
    onModelFileReselect: () => void
    onDataFileReselect: () => void
    isVisible: boolean
}

export function AnalyzerHeader({
    modelFile,
    dataFile,
    onModelFileReselect,
    onDataFileReselect,
    isVisible,
}: AnalyzerHeaderProps) {
    if (!isVisible) return null

    return (
        <motion.div
            initial={{ y: -60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
            className="sticky top-0 z-20 bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-700/50 p-4"
        >
            <div className="flex items-center space-x-4">
                <motion.button
                    layoutId="model-input"
                    onClick={onModelFileReselect}
                    className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors group"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                >
                    <Database className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <div className="text-left">
                        <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">Model</div>
                        <div className="text-sm font-mono text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {modelFile?.name}
                        </div>
                    </div>
                </motion.button>

                <motion.button
                    layoutId="data-input"
                    onClick={onDataFileReselect}
                    className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-green-50 dark:bg-green-900/30 hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors group"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                >
                    <FileText className="w-4 h-4 text-green-600 dark:text-green-400" />
                    <div className="text-left">
                        <div className="text-xs text-green-600 dark:text-green-400 font-medium">Dataset</div>
                        <div className="text-sm font-mono text-gray-900 dark:text-white group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
                            {dataFile?.name}
                        </div>
                    </div>
                </motion.button>
            </div>
        </motion.div>
    )
}
