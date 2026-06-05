/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useAtom } from "jotai";
import { Braces, Code, RefreshCw } from "lucide-react";
import { m as motion } from "motion/react";
import { schemaErrorsAtom } from "../../editor/atoms";

interface ToggleButtonProps {
  isProcessing: boolean;
  isJsonActive: boolean;
  onToggleMode: () => void;
}

export function ToggleButton({ isProcessing, isJsonActive, onToggleMode }: ToggleButtonProps) {
  const [schemaErrors] = useAtom(schemaErrorsAtom);
  const hasBlockingErrors = schemaErrors.some(
    (error: { severity?: "error" | "warning" }) => error.severity !== "warning",
  );
  const disabled = hasBlockingErrors || isProcessing;

  const isTransitioning = isProcessing;

  const handleToggle = () => {
    if (disabled) return;
    onToggleMode();
  };

  // Calculate the progress bar properties
  const getProgressBarProps = () => {
    if (isTransitioning) {
      // During transition, always expand from left (x=4) and cover full width
      return {
        x: 4,
        width: 156, // Full width minus padding (176 - 20 = 156)
        justifyContent: "center" as const,
      };
    }
    // Normal state - positioned on the active side
    return {
      x: isJsonActive ? 4 : 84, // Left side or right side (with padding)
      width: 76, // Half width minus padding
      justifyContent: "center" as const,
    };
  };

  const progressProps = getProgressBarProps();

  return (
    <motion.div
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="flex h-full flex-col items-center justify-center gap-3 self-center"
    >
      <div className="relative">
        <motion.button
          disabled={disabled}
          onClick={handleToggle}
          whileHover={!disabled ? { scale: 1.02 } : {}}
          whileTap={!disabled ? { scale: 0.98 } : {}}
          className={`
              relative flex h-12 w-44 items-center overflow-hidden rounded-full border p-1 transition-all duration-200
              ${
                disabled
                  ? "cursor-not-allowed border-[var(--border-soft)] bg-[var(--surface-muted)]"
                  : "border-[var(--border-soft)] bg-[var(--surface-primary)] shadow-[var(--shadow-card)] hover:bg-[var(--surface-muted)]"
              }
            `}
        >
          <motion.div
            animate={{
              x: progressProps.x,
              width: progressProps.width,
            }}
            transition={{
              duration: 1,
              ease: isTransitioning ? "easeInOut" : "easeOut",
            }}
            className={`absolute z-20 h-10 rounded-full ${
              disabled ? "bg-[var(--text-muted)]" : "bg-[var(--accent-primary)]"
            } shadow-[var(--shadow-card)]`}
            style={{
              top: 4,
            }}
          >
            <div className="flex h-full w-full items-center justify-center text-white">
              <motion.div
                key={isTransitioning ? "spinning" : isJsonActive ? "json" : "html"}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.2 }}
              >
                {isTransitioning ? (
                  <RefreshCw className="size-5 animate-spin" />
                ) : isJsonActive ? (
                  <Braces className="size-5" />
                ) : (
                  <Code className="size-5" />
                )}
              </motion.div>
            </div>
          </motion.div>

          <div className="absolute inset-1 flex items-center z-10">
            <motion.div
              animate={{
                opacity: isTransitioning || isJsonActive ? 0 : 1,
              }}
              transition={{ duration: 0.2 }}
              className="flex h-10 w-20 items-center justify-center text-[var(--text-secondary)]"
            >
              <Braces className="size-5" />
            </motion.div>

            <motion.div
              animate={{
                opacity: isTransitioning || !isJsonActive ? 0 : 1,
              }}
              transition={{ duration: 0.2 }}
              className="flex h-10 w-20 items-center justify-center text-[var(--text-secondary)]"
            >
              <Code className="size-5" />
            </motion.div>
          </div>
        </motion.button>
      </div>

      <motion.div
        key={isTransitioning ? "processing" : isJsonActive ? "json" : "html"}
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="text-sm font-medium text-[var(--text-secondary)]"
      >
        {isTransitioning ? (
          <span className="flex items-center gap-2">
            <RefreshCw className="size-3 animate-spin" />
            Processing…
          </span>
        ) : (
          `${isJsonActive ? "JSON" : "HTML"} Mode`
        )}
      </motion.div>
    </motion.div>
  );
}
