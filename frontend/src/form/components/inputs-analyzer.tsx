import { useAtom } from "jotai"
import { CheckCircle, Database, FileText, RefreshCw, Upload } from "lucide-react"
import { motion } from "motion/react"
import { schemaAtom, schemaErrorsAtom, schemaTextAtom } from "../../editor/atoms"
import { useGenerateSchemaMutation } from "../hooks"

interface InputsAnalyzerProps {
    modelFile: File | null
    dataFile: File | null
    isLoading: boolean
    onModelFileChange: (file: File | null) => void
    onDataFileChange: (file: File | null) => void
    onAcceptFiles: () => void
}

export function InputsAnalyzer({
    modelFile,
    dataFile,
    isLoading,
    onModelFileChange,
    onDataFileChange,
    onAcceptFiles,
}: InputsAnalyzerProps) {

    const [, setSchemaText] = useAtom(schemaTextAtom);
    const [, setSchemaObj] = useAtom(schemaAtom);
    const [, setSchemaErrors] = useAtom(schemaErrorsAtom);

    const { mutate } = useGenerateSchemaMutation((schema) => {
        setSchemaText(JSON.stringify(schema, null, 3)); // pretty print
        setSchemaObj(schema);
        setSchemaErrors([]);
    });

    const onSelected = () => {
        if (!modelFile) return;
        mutate({ model: modelFile, dataframe: dataFile });
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center justify-center min-h-[100dvh] p-8"
        >
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 dark:border-gray-700/20 p-12 max-w-4xl w-full">
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.2, duration: 0.5 }}
                    className="text-center mb-12"
                >
                    <div className="relative inline-block mb-6">
                        <Database className="w-20 h-20 text-blue-600 dark:text-blue-400 mx-auto" />
                        <motion.div
                            className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
                        />
                    </div>
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-blue-600 dark:from-white dark:to-blue-400 bg-clip-text text-transparent mb-4">
                        Advanced Model Analyzer
                    </h1>
                    <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
                        Upload your machine learning model and dataset files to generate comprehensive analysis
                    </p>
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                    <motion.div
                        initial={{ x: -30, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: 0.3, duration: 0.5 }}
                        layoutId="model-input"
                    >
                        <label htmlFor="model-file" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                            Machine Learning Model
                        </label>
                        <div className="relative group">
                            <input
                                id="model-file"
                                type="file"
                                accept=".*"
                                onChange={(e) => onModelFileChange(e.target.files?.[0] || null)}
                                className="sr-only"
                            />
                            <label
                                htmlFor="model-file"
                                className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-2xl cursor-pointer hover:border-blue-500 dark:hover:border-blue-400 transition-all duration-300 bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-900/20 dark:to-indigo-900/20 group-hover:from-blue-100/50 group-hover:to-indigo-100/50"
                            >
                                <div className="text-center p-4">
                                    <Upload className="w-10 h-10 text-blue-500 dark:text-blue-400 mx-auto mb-3 group-hover:scale-110 transition-transform" />
                                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        {modelFile ? (
                                            <span className="font-mono text-blue-600 dark:text-blue-400">{modelFile.name}</span>
                                        ) : (
                                            "Upload .joblib model"
                                        )}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Scikit-learn, XGBoost, or similar</p>
                                </div>
                            </label>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ x: 30, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: 0.4, duration: 0.5 }}
                        layoutId="data-input"
                    >
                        <label htmlFor="data-file" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                            Dataset DataFrame
                        </label>
                        <div className="relative group">
                            <input
                                id="data-file"
                                type="file"
                                accept=".*"
                                onChange={(e) => onDataFileChange(e.target.files?.[0] || null)}
                                className="sr-only"
                            />
                            <label
                                htmlFor="data-file"
                                className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-2xl cursor-pointer hover:border-green-500 dark:hover:border-green-400 transition-all duration-300 bg-gradient-to-br from-green-50/50 to-emerald-50/50 dark:from-green-900/20 dark:to-emerald-900/20 group-hover:from-green-100/50 group-hover:to-emerald-100/50"
                            >
                                <div className="text-center p-4">
                                    <FileText className="w-10 h-10 text-green-500 dark:text-green-400 mx-auto mb-3 group-hover:scale-110 transition-transform" />
                                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        {dataFile ? (
                                            <span className="font-mono text-green-600 dark:text-green-400">{dataFile.name}</span>
                                        ) : (
                                            "Upload .pkl dataset"
                                        )}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Pandas DataFrame or NumPy array</p>
                                </div>
                            </label>
                        </div>
                    </motion.div>
                </div>

                <motion.div
                    initial={{ y: 30, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.5, duration: 0.5 }}
                    className="text-center"
                >
                    <button
                        onClick={() => {
                            onAcceptFiles();
                            onSelected();
                        }}
                        disabled={!modelFile}
                        className="relative inline-flex items-center justify-center px-12 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl disabled:shadow-none transform hover:scale-105 disabled:scale-100 disabled:cursor-not-allowed min-w-[200px]"
                    >
                        {isLoading ? (
                            <>
                                <RefreshCw className="w-5 h-5 mr-3 animate-spin" />
                                <span>Processing Files...</span>
                            </>
                        ) : (
                            <>
                                <CheckCircle className="w-5 h-5 mr-3" />
                                <span>Accept Files</span>
                            </>
                        )}
                    </button>
                </motion.div>
            </div>
        </motion.div>
    )
}
