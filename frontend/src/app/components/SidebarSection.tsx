export function SidebarSection({ children, className = "" }: {
    children: React.ReactNode, className?: string
}) {
    return <div className={`flex flex-col gap-[8px] ${className}`}>{children}</div>;
}
