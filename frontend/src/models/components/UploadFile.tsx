/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { CheckCircle, Trash2, Upload } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { AppIconButton, cx } from "../../app/components";

type UploadFileProps = {
	acceptedFormats?: string[];
	selectedFile: File | null;
	setSelectedFile: (file: File | null) => void;
};

const CHANGE_FILE_HINT = "Click to change file or drag a new one";
const UPLOAD_FILE_HINT = "Drag your file here or click to select";
const SUPPORTED_FORMATS_HINT = "Supported formats: <<formats>>";

const getFileSize = (size: number) => {
	const units = ["B", "KB", "MB", "GB", "TB"];
	let unitIndex = 0;
	while (size >= 1024 && unitIndex < units.length - 1) {
		size /= 1024;
		unitIndex++;
	}
	return `${size.toFixed(2)} ${units[unitIndex]}`;
};

export function UploadFile({
	acceptedFormats,
	selectedFile,
	setSelectedFile,
}: UploadFileProps) {
	const [isDragOver, setIsDragOver] = useState(false);

	const handleFileSelect = (file: File) => {
		setSelectedFile(file);
		// Auto-fill model name from filename (remove extension)
	};

	const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		if (file) {
			handleFileSelect(file);
		}
	};

	const handleDrop = (event: React.DragEvent) => {
		event.preventDefault();
		setIsDragOver(false);
		const file = event.dataTransfer.files[0];
		if (file) {
			handleFileSelect(file);
		}
	};

	const handleDragOver = (event: React.DragEvent) => {
		event.preventDefault();
		setIsDragOver(true);
	};

	const handleDragLeave = () => {
		setIsDragOver(false);
	};
	return (
		<div
			className={cx(
				"relative rounded-[28px] border-2 border-dashed p-8 transition-all duration-300",
				isDragOver
					? "border-[var(--accent-primary)] bg-[var(--accent-quiet)]"
					: selectedFile
						? "border-[color:var(--success-text)] bg-[var(--success-quiet)]"
						: "border-[var(--border-soft)] bg-[var(--surface-secondary)] hover:border-[var(--accent-primary)] hover:bg-[var(--surface-muted)]",
			)}
			onDrop={handleDrop}
			onDragOver={handleDragOver}
			onDragLeave={handleDragLeave}
		>
			<input
				type="file"
				accept={acceptedFormats?.join(", ") || "*"}
				onChange={handleFileChange}
				className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
			/>

			<div className="relative z-10 text-center">
				{selectedFile ? (
					<motion.div
						initial={{ scale: 0.8, opacity: 0 }}
						animate={{ scale: 1, opacity: 1 }}
						className="space-y-3"
					>
						<div className="flex justify-end">
							<AppIconButton
								type="button"
								aria-label="Remove uploaded file"
								onClick={(event) => {
									event.preventDefault();
									event.stopPropagation();
									setSelectedFile(null);
								}}
								className="border border-transparent bg-[var(--surface-primary)] text-[var(--text-muted)] hover:text-[var(--danger-text)]"
							>
								<Trash2 className="h-4 w-4" />
							</AppIconButton>
						</div>
						<div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--surface-primary)] text-[var(--success-text)] shadow-[var(--shadow-card)]">
							<CheckCircle className="h-8 w-8" />
						</div>
						<div>
							<p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--success-text)]">
								Upload complete
							</p>
							<p className="font-medium text-[var(--text-primary)]">
								{selectedFile.name}
							</p>
							<p className="text-sm text-[var(--success-text)]">
								{getFileSize(selectedFile.size)}
							</p>
						</div>
						<p className="text-xs text-[var(--text-secondary)]">
							{CHANGE_FILE_HINT}
						</p>
					</motion.div>
				) : (
					<div className="space-y-3">
						<div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--surface-primary)] text-[var(--accent-primary)] shadow-[var(--shadow-card)]">
							<Upload className="h-8 w-8" />
						</div>
						<div>
							<p className="font-medium text-[var(--text-primary)]">
								{UPLOAD_FILE_HINT}
							</p>
							<p className="mt-1 text-sm text-[var(--text-secondary)]">
								{SUPPORTED_FORMATS_HINT.replace(
									"<<formats>>",
									acceptedFormats?.join(", ") || "any",
								)}
							</p>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
