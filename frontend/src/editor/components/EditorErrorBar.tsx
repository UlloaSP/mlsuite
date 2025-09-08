import { useAtom } from "jotai";
import { AlertCircle, CheckCircle, ChevronUp } from "lucide-react";
import { motion } from "motion/react";
import { useEffect } from "react";
import { schemaErrorsAtom } from "../atoms";

type EditorErrorBarProps = {
	expanded: boolean;
	setExpanded: (expanded: boolean) => void;
};

export function EditorErrorBar({ expanded, setExpanded }: EditorErrorBarProps) {
	const [schemaErrors] = useAtom(schemaErrorsAtom);

	const hasErrors = schemaErrors.length > 0;

	useEffect(() => {
		!hasErrors ? setExpanded(false) : {};
	}, [hasErrors, setExpanded]);

	return (
		<motion.button
			type="button"
			disabled={!hasErrors}
			onClick={() => hasErrors && setExpanded(!expanded)}
			className={`flex flex-row h-8 w-full px-4 flex items-center justify-between text-white
          ${
						hasErrors
							? "bg-red-600 dark:bg-red-700 cursor-pointer"
							: "bg-emerald-400 dark:bg-emerald-400 cursor-default"
					}`}
		>
			{hasErrors ? (
				<>
					<motion.span className="flex items-center space-x-2 text-sm font-bold">
						<AlertCircle size={16} />
						<motion.span>
							{schemaErrors.length} Error{schemaErrors.length > 1 && "s"}
						</motion.span>
					</motion.span>
					<motion.div
						animate={{ rotate: expanded ? 180 : 0 }}
						transition={{ duration: 0.2 }}
					>
						<ChevronUp size={14} />
					</motion.div>
				</>
			) : (
				<motion.span className="flex items-center space-x-2 text-sm font-bold">
					<CheckCircle size={16} />
					<motion.span>Valid</motion.span>
				</motion.span>
			)}
		</motion.button>
	);
}
