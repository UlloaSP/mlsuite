import { CheckCircle, Upload } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";

type UploadFileProps = {
    acceptedFormats?: string[];
    selectedFile: File | null;
    setSelectedFile: (file: File | null) => void;
}

const CHANGE_FILE_HINT = "Click to change file or drag a new one";
const UPLOAD_FILE_HINT = "Drag your file here or click to select";
const SUPPORTED_FORMATS_HINT = "Supported formats: <<formats>>";

const getFileSize = (size: number) => {
    const units = ["B", "KB", "MB", "GB", "TB"];
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex++;
    }
    return `${size.toFixed(2)} ${units[unitIndex]}`;
}



export function UploadFile({ acceptedFormats, selectedFile, setSelectedFile }: UploadFileProps) {

    const [isDragOver, setIsDragOver] = useState(false)

    const handleFileSelect = (file: File) => {
        setSelectedFile(file)
        // Auto-fill model name from filename (remove extension)

    }

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (file) {
            handleFileSelect(file)
        }
    }

    const handleDrop = (event: React.DragEvent) => {
        event.preventDefault()
        setIsDragOver(false)
        const file = event.dataTransfer.files[0]
        if (file) {
            handleFileSelect(file)
        }
    }

    const handleDragOver = (event: React.DragEvent) => {
        event.preventDefault()
        setIsDragOver(true)
    }

    const handleDragLeave = () => {
        setIsDragOver(false)
    }
    return (
        <div
            className={`relative border-2 border-dashed rounded-2xl p-8 transition-all duration-300 ${isDragOver
                ? "border-blue-400 bg-blue-50 dark:bg-blue-900/20"
                : selectedFile
                    ? "border-green-400 bg-green-50 dark:bg-green-900/20"
                    : "border-gray-300 dark:border-gray-600 hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-900/10"
                }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
        >
            <input
                type="file"
                accept={acceptedFormats?.join(", ") || "*"}
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />

            <div className="text-center">
                {selectedFile ? (
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="space-y-3"
                    >
                        <div className="w-16 h-16 mx-auto bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                            <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                            <p className="font-medium text-green-700 dark:text-green-400">{selectedFile.name}</p>
                            <p className="text-sm text-green-600 dark:text-green-500">
                                {getFileSize(selectedFile.size)}
                            </p>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            {CHANGE_FILE_HINT}
                        </p>
                    </motion.div>
                ) : (
                    <div className="space-y-3">
                        <div className="w-16 h-16 mx-auto bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                            <Upload className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <p className="font-medium text-gray-700 dark:text-gray-300">
                                {UPLOAD_FILE_HINT}
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                    {SUPPORTED_FORMATS_HINT.replace("<<formats>>", acceptedFormats?.join(", ") || "any")}
                                </p>
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );

}