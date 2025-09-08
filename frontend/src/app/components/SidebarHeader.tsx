import { useUser } from "../../user/hooks"; // Adjust the import path as necessary

export function SidebarHeader() {
    const { data: user } = useUser();

    return (
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex flex-col items-center space-y-2">
                <img
                    src={user?.avatarUrl}
                    alt="User"
                    className="w-10 h-10 rounded-full"
                    referrerPolicy="no-referrer"
                />
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {user?.userName || user?.fullName || "Guest"}
                </span>
            </div>
        </div>
    );
}
