import { motion } from "motion/react";

export function HomePage() {
    return (
        <div className="w-full h-full bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
            <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-center space-y-6"
            >
                <motion.h1
                    className="text-6xl font-bold text-gray-900 dark:text-white"
                    initial={{ scale: 0.9 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.3 }}
                >
                    Welcome Home
                </motion.h1>
                <motion.p
                    className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.4 }}
                >
                    This is your home dashboard. Navigate through the sidebar to explore
                    different sections of the application.
                </motion.p>
                <motion.div
                    className="grid grid-cols-3 gap-6 mt-12"
                    initial={{ y: 30, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.5 }}
                >
                    {[1, 2, 3].map((i) => (
                        <motion.div
                            key={i}
                            className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg"
                            whileHover={{ scale: 1.05, y: -5 }}
                            transition={{ duration: 0.2 }}
                        >
                            <div className="w-12 h-12 bg-blue-500 rounded-lg mb-4"></div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                                Feature {i}
                            </h3>
                            <p className="text-gray-600 dark:text-gray-300">
                                Description of feature {i} goes here.
                            </p>
                        </motion.div>
                    ))}
                </motion.div>
            </motion.div>
        </div>
    );
}
