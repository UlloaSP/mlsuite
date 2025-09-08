import { motion } from "motion/react"

export type BestPracticesProps = {
    title: string
    practices: string[]
}

export function BestPractices({ title, practices }: BestPracticesProps) {
    return (
        <motion.div
            className="justify-self-end p-4 rounded-2xl bg-slate-100/70 dark:bg-slate-800/50 backdrop-blur-sm ring-1 ring-inset ring-slate-300 dark:ring-slate-700 shadow-md"
        >
            <motion.h2 className="text-slate-800 dark:text-slate-200 font-semibold mb-2 text-sm">
                {title}
            </motion.h2>
            <motion.ul className="list-disc list-inside text-xs text-slate-600 dark:text-slate-400 space-y-1">
                {practices.map((practice, index) => (
                    <motion.li key={index}>{practice}</motion.li>
                ))}
            </motion.ul>
        </motion.div>
    )
}