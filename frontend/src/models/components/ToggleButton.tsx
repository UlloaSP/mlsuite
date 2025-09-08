import { motion } from "framer-motion";
import { useAtom } from "jotai";
import { Braces, Code, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { schemaErrorsAtom } from "../../editor/atoms";

interface ToggleButtonProps {
    isProcessing: boolean;
    onToggleMode: () => void;
}

export function ToggleButton({ isProcessing, onToggleMode }: ToggleButtonProps) {
    const [schemaErrors] = useAtom(schemaErrorsAtom);
    const disabled = schemaErrors.length !== 0 || isProcessing;

    // Local state to track which mode is active
    const [isJson, setIsJson] = useState(true)
    // State to track if we're in the middle of a transition
    const [isTransitioning, setIsTransitioning] = useState(false)

    const handleToggle = () => {
        if (disabled || isTransitioning) return

        setIsTransitioning(true)
        onToggleMode()
    }

    // Effect to handle the completion of processing
    useEffect(() => {
        if (!isProcessing && isTransitioning) {
            // Complete the transition
            setIsJson((prev) => !prev)
            setIsTransitioning(false)
        }
    }, [isProcessing, isTransitioning])

    // Calculate the progress bar properties
    const getProgressBarProps = () => {
        if (isTransitioning) {
            // During transition, always expand from left (x=4) and cover full width
            return {
                x: 4,
                width: 156, // Full width minus padding (176 - 20 = 156)
                justifyContent: "center" as const,
            }
        }
        // Normal state - positioned on the active side
        return {
            x: isJson ? 4 : 84, // Left side or right side (with padding)
            width: 76, // Half width minus padding
            justifyContent: "center" as const,
        }
    }

    const progressProps = getProgressBarProps()

    return (
        <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col self-center justify-center items-center gap-3 h-full"
        >
            {/* Toggle Switch */}
            <div className="relative">
                <motion.button
                    disabled={disabled}
                    onClick={handleToggle}
                    whileHover={!disabled ? { scale: 1.02 } : {}}
                    whileTap={!disabled ? { scale: 0.98 } : {}}
                    className={`
              relative flex h-12 w-44 items-center rounded-full p-1 transition-all duration-200 overflow-hidden
              ${disabled ? "bg-gray-200 cursor-not-allowed" : "bg-gray-100 hover:bg-gray-200 shadow-sm"}
            `}
                >
                    {/* Progress Bar / Active Element */}
                    <motion.div
                        animate={{
                            x: progressProps.x,
                            width: progressProps.width,
                        }}
                        transition={{
                            duration: 1,
                            ease: isTransitioning ? "easeInOut" : "easeOut",
                        }}
                        className="absolute h-10 rounded-full bg-emerald-500 shadow-sm z-20"
                        style={{
                            top: 4,
                        }}
                    >
                        {/* Icon inside the progress bar */}
                        <div className="flex h-full w-full items-center justify-center text-white">
                            <motion.div
                                key={isTransitioning ? "spinning" : isJson ? "json" : "html"}
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ duration: 0.2 }}
                            >
                                {isTransitioning ? (
                                    <RefreshCw className="h-5 w-5 animate-spin" />
                                ) : isJson ? (
                                    <Braces className="h-5 w-5" />
                                ) : (
                                    <Code className="h-5 w-5" />
                                )}
                            </motion.div>
                        </div>
                    </motion.div>

                    {/* Static Labels - Only visible when not covered by active element */}
                    <div className="absolute inset-1 flex items-center z-10">
                        {/* JSON Label */}
                        <motion.div
                            animate={{
                                opacity: isTransitioning || isJson ? 0 : 1,
                            }}
                            transition={{ duration: 0.2 }}
                            className="flex h-10 w-20 items-center justify-center text-gray-500"
                        >
                            <Braces className="h-5 w-5" />
                        </motion.div>

                        {/* HTML Label */}
                        <motion.div
                            animate={{
                                opacity: isTransitioning || !isJson ? 0 : 1,
                            }}
                            transition={{ duration: 0.2 }}
                            className="flex h-10 w-20 items-center justify-center text-gray-500"
                        >
                            <Code className="h-5 w-5" />
                        </motion.div>
                    </div>
                </motion.button>
            </div>

            {/* Status Text */}
            <motion.div
                key={isTransitioning ? "processing" : isJson ? "json" : "html"}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="text-sm text-gray-500 font-medium"
            >
                {isTransitioning ? (
                    <span className="flex items-center gap-2">
                        <RefreshCw className="h-3 w-3 animate-spin" />
                        Processing...
                    </span>
                ) : (
                    `${isJson ? "JSON" : "HTML"} Mode`
                )}
            </motion.div>
        </motion.div>
    )
}
