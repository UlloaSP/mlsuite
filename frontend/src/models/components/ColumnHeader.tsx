import { ColumnActionButton } from "./ColumnActionButton";

type ColumnHeaderProps = {
    title: string;
    onClick: () => void | Promise<void>;
    label: string;
}

export function ColumnHeader({ title, onClick, label }: ColumnHeaderProps) {
    return (
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">{title}</h2>
            <ColumnActionButton onClick={onClick} label={label}></ColumnActionButton>
        </div>
    );
}