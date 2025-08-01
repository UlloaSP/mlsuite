import { AnimatePresence, motion } from "motion/react";

export function PageTransition({ children, pageKey, iconPosition }: any) {
    const centerX = typeof window !== "undefined" ? window.innerWidth / 2 : 0;
    const centerY = typeof window !== "undefined" ? window.innerHeight / 2 : 0;

    return (
        <AnimatePresence mode="wait">
            <motion.div
                key={pageKey}
                initial={
                    iconPosition
                        ? {
                            scale: 0,
                            x: iconPosition.x - centerX,
                            y: iconPosition.y - centerY,
                            opacity: 0,
                        }
                        : {
                            opacity: 0,
                            scale: 0.9,
                        }
                }
                animate={{
                    scale: 1,
                    x: 0,
                    y: 0,
                    opacity: 1,
                }}
                exit={
                    iconPosition
                        ? {
                            scale: 0,
                            x: iconPosition.x - centerX,
                            y: iconPosition.y - centerY,
                            opacity: 0,
                        }
                        : {
                            opacity: 0,
                            scale: 0.9,
                        }
                }
                transition={{
                    duration: 0.4,
                    ease: [0.4, 0, 0.2, 1],
                }}
                className="w-full h-full"
            >
                {children}
            </motion.div>
        </AnimatePresence>
    );
}
