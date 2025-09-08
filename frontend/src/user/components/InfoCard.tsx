import type { LucideIcon } from "lucide-react";
import { motion } from "motion/react";

export type InfoCardProps = {
    icon: LucideIcon;
    title: string;
    value: string | number;
};

export function InfoCard({ icon: Icon, title, value }: InfoCardProps) {
    return <motion.div
        className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg"
        whileHover={{ scale: 1.02 }}
    >
        <motion.div className="flex items-center space-x-3">
            <Icon className="text-purple-500" size={20} />
            <motion.div>
                <motion.p className="text-sm text-gray-500 dark:text-gray-400">
                    {title}
                </motion.p>
                <motion.p className="font-medium text-gray-900 dark:text-white">
                    {value}
                </motion.p>
            </motion.div>
        </motion.div>
    </motion.div>;
}