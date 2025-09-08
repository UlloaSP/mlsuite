import { Plus } from "lucide-react";
import { motion } from "motion/react";

type ColumnActionButtonProps = {
    onClick: () => void | Promise<void>;
    label: string;
};

export function ColumnActionButton({ onClick, label }: ColumnActionButtonProps) {
    return (
        <motion.button
            onClick={onClick}
            className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
        >
            <Plus size={18} />
            <span>{label}</span>
        </motion.button>
    );
}