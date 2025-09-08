import { motion } from "motion/react";


const container = {
    hidden: { opacity: 0, x: -40 },
    show: {
        opacity: 1,
        x: 0,
        transition: { staggerChildren: 0.12, duration: 0.5 },
    },
};
const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
};

export type TimelineProps = {
    steps: {
        icon: React.ComponentType<{ size?: number }>
        label: string
    }[]
}

export function Timeline({ steps }: TimelineProps) {
    return (
        <motion.ul
            variants={container}
            initial="hidden"
            animate="show"
            className="justify-self-start relative space-y-7"
        >
            {/* Vertical line */}
            <span className="absolute left-5 top-0 bottom-0 w-px bg-gray-300 dark:bg-slate-700/40" />
            {/* Steps */}
            {
                steps.map(({ icon: Icon, label }, idx) => (
                    <motion.li key={idx} variants={item} className="flex items-center gap-3">
                        <span className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full bg-gray-200/60 dark:bg-slate-800/60 backdrop-blur ring-1 ring-inset ring-gray-300 dark:ring-slate-700 shadow-inner">
                            <Icon size={18} />
                        </span>
                        <span className="text-sm text-gray-700 dark:text-slate-300 md:text-base">{label}</span>
                    </motion.li>
                ))
            }
        </motion.ul>
    )
}