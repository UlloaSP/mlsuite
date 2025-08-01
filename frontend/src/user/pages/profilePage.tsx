import { Calendar, Mail, MapPin, User } from "lucide-react";
import { motion } from "motion/react";
import { useUser } from "../hooks"; // Adjust the import path as necessary

export function ProfilePage() {
    const { data: user, isLoading, isError } = useUser();

    if (isLoading) {
        return <div className="text-center text-gray-500">Loading...</div>;
    }

    if (isError || !user) {
        return <div className="text-center text-red-500">Error loading profile</div>;
    }

    return (
        <div className="w-full h-full bg-gradient-to-br from-purple-50 to-pink-100 dark:from-gray-900 dark:to-purple-900 flex items-center justify-center p-8">
            <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-2xl w-full"
            >
                <motion.div
                    initial={{ scale: 0.9 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.3 }}
                    className="text-center mb-8"
                >
                    <div className="relative inline-block">
                        <img
                            src={user?.avatarUrl}
                            alt="Profile"
                            className="w-32 h-32 rounded-full mx-auto mb-4 border-4 border-purple-200 dark:border-purple-700"
                            referrerPolicy="no-referrer"
                        />
                        <motion.div
                            className="absolute -bottom-2 -right-2 w-8 h-8 bg-green-500 rounded-full border-4 border-white dark:border-gray-800"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.5, type: "spring" }}
                        />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                        {user?.displayName || user?.userName || user?.fullName || "Guest"}
                    </h1>
                    <p className="text-gray-600 dark:text-gray-300">
                        {user ? `Logged in with ${user.oauthProvider}` : "Not logged in"}
                    </p>
                </motion.div>

                <motion.div
                    initial={{ y: 30, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="space-y-6"
                >
                    <div className="grid grid-cols-2 gap-6">
                        <motion.div
                            className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg"
                            whileHover={{ scale: 1.02 }}
                        >
                            <div className="flex items-center space-x-3">
                                <Mail className="text-purple-500" size={20} />
                                <div>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        Email
                                    </p>
                                    <p className="font-medium text-gray-900 dark:text-white">
                                        {user?.email || "Not provided"}
                                    </p>
                                </div>
                            </div>
                        </motion.div>

                        <motion.div
                            className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg"
                            whileHover={{ scale: 1.02 }}
                        >
                            <div className="flex items-center space-x-3">
                                <Calendar className="text-purple-500" size={20} />
                                <div>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        Joined
                                    </p>
                                    <p className="font-medium text-gray-900 dark:text-white">
                                        {user?.createdAt || "Not provided"}
                                    </p>
                                </div>
                            </div>
                        </motion.div>

                        <motion.div
                            className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg"
                            whileHover={{ scale: 1.02 }}
                        >
                            <div className="flex items-center space-x-3">
                                <MapPin className="text-purple-500" size={20} />
                                <div>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        Location
                                    </p>
                                    <p className="font-medium text-gray-900 dark:text-white">
                                        {user?.location || "Not provided"}
                                    </p>
                                </div>
                            </div>
                        </motion.div>

                        <motion.div
                            className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg"
                            whileHover={{ scale: 1.02 }}
                        >
                            <div className="flex items-center space-x-3">
                                <User className="text-purple-500" size={20} />
                                <div>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        Name
                                    </p>
                                    <p className="font-medium text-gray-900 dark:text-white">
                                        {user?.fullName || "Not provided"}
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    </div>

                    <motion.div
                        className="bg-gradient-to-r from-purple-500 to-pink-500 p-6 rounded-lg text-white"
                        initial={{ scale: 0.95 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.6 }}
                    >
                        <h3 className="text-lg font-semibold mb-2">Profile Completion</h3>
                        <div className="bg-white/20 rounded-full h-2 mb-2">
                            <motion.div
                                className="bg-white rounded-full h-2"
                                initial={{ width: 0 }}
                                animate={{ width: "75%" }}
                                transition={{ delay: 0.8, duration: 1 }}
                            />
                        </div>
                        <p className="text-sm opacity-90">75% complete</p>
                    </motion.div>
                </motion.div>
            </motion.div>
        </div>
    );
}
