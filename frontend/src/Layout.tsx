import { Outlet } from "react-router-dom";
import { Sidebar } from "./app/components";

function Layout() {
	return (
		<div className="w-screen h-screen flex overflow-hidden bg-gray-100 dark:bg-gray-900">
			{/* Main Content Area - 90% */}
			<div className="flex-1 relative">
				<Outlet />
			</div>

			{/* Sidebar - 10% */}
			<div className="w-[10%] min-w-[200px]">
				<Sidebar />
			</div>
		</div>
	);
}

export default Layout;
