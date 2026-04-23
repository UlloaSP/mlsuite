/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import {
	ChevronDown,
	ChevronUp,
	FileText,
	RefreshCcw,
	Save
} from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import {
	AppButton,
	AppCopy,
	AppPage,
	AppPanel,
	AppSurface,
	AppTextField,
} from "../../app/components";
import { NotFoundError } from "../../app/pages/error-page";
import { useUser } from "../../user/hooks";
import { CreateModelHeader } from "../components/CreateModelHeader";
import { UploadFile } from "../components/UploadFile";
import { useCreateModelMutation } from "../hooks";

export function CreateModelPage() {
	const [selectedModelFile, setSelectedModelFile] = useState<File | null>(null);
	const [selectedDataframeFile, setSelectedDataframeFile] =
		useState<File | null>(null);
	const [name, setName] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [showDataframeUploader, setShowDataframeUploader] = useState(false);

	const mutation = useCreateModelMutation();
	const navigate = useNavigate();

	const { data: user, error } = useUser();

	const handleSave = async () => {
		if (!selectedModelFile || !name) return;

		setIsLoading(true);
		try {
			const created = await mutation.mutateAsync({
				name,
				modelFile: selectedModelFile,
				dataframeFile: selectedDataframeFile ?? undefined,
			});
			navigate(`/models/${created.model.id}?tab=signatures`);
		} catch (err) {
		} finally {
			setIsLoading(false);
		}
	};

	const isFormValid = selectedModelFile && name.trim();

	useEffect(() => {
		if (!selectedModelFile) {
			setName("");
			return;
		}
		const nameWithoutExtension = selectedModelFile.name.replace(
			/\.[^/.]+$/,
			"",
		);
		setName(
			nameWithoutExtension
				.replace(/[_-]/g, " ")
				.replace(/\b\w/g, (l) => l.toUpperCase()),
		);
	}, [selectedModelFile]);

	useEffect(() => {
		if (selectedDataframeFile) {
			setShowDataframeUploader(true);
		}
	}, [selectedDataframeFile]);

	if (!user || error) return <NotFoundError />;

	return (
		<AppPage>
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.5 }}
				className="flex flex-1"
			>
				<AppSurface className="flex flex-1 flex-col gap-8 overflow-auto">
					<CreateModelHeader />

					<div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.9fr)]">
						<div className="space-y-6">
							<div className="space-y-3">
								<label className="block text-sm font-semibold text-[var(--text-primary)]">
									Model File
								</label>
								<UploadFile
									acceptedFormats={[".joblib"]}
									selectedFile={selectedModelFile}
									setSelectedFile={setSelectedModelFile}
								/>
							</div>

							<div className="space-y-3">
								<div className="flex flex-wrap items-center justify-between gap-3">
									<div>
										<p className="text-sm font-semibold text-[var(--text-primary)]">
											Model Dataframe
										</p>
										<AppCopy className="text-xs">
											Optional. Add it only if you want to preserve feature context alongside the model artifact.
										</AppCopy>
									</div>
									<AppButton
										type="button"
										variant="secondary"
										onClick={() => setShowDataframeUploader((value) => !value)}
									>
										{showDataframeUploader || selectedDataframeFile ? (
											<>
												<ChevronUp size={16} />
												<span>Hide optional Dataframe</span>
											</>
										) : (
											<>
												<ChevronDown size={16} />
												<span>+ Add optional Dataframe</span>
											</>
										)}
									</AppButton>
								</div>

								{showDataframeUploader || selectedDataframeFile ? (
									<UploadFile
										acceptedFormats={[".joblib"]}
										selectedFile={selectedDataframeFile}
										setSelectedFile={setSelectedDataframeFile}
									/>
								) : null}
							</div>
						</div>

						<AppPanel className="flex h-fit flex-col gap-5">
							<div className="space-y-2">
								<label
									htmlFor="model-name"
									className="block text-sm font-semibold text-[var(--text-primary)]"
								>
									Model Name
								</label>
								<AppTextField
									id="model-name"
									type="text"
									value={name}
									onChange={(e) => setName(e.target.value)}
									placeholder={selectedModelFile ? "Enter the model name..." : "Upload a model file first..."}
									prefix={<FileText className="h-5 w-5 text-[var(--text-muted)]" />}
									className={`w-full ${selectedModelFile ? "" : "opacity-60"}`}
									disabled={!selectedModelFile}
								/>
								<AppCopy className="text-xs">
									{selectedModelFile
										? "Name auto-filled from the uploaded file. You can refine it before saving."
										: "Upload a model file to auto-fill the name, then edit it if needed."}
								</AppCopy>
							</div>

							<AppPanel className="space-y-2 border-dashed bg-[var(--surface-secondary)] shadow-none">
								<p className="text-sm font-semibold text-[var(--text-primary)]">
									Upload Notes
								</p>
								<AppCopy className="text-xs">
									Keep the model artifact versioned before upload. Add the dataframe only when you need feature lineage in the workspace.
								</AppCopy>
							</AppPanel>

							<div className="flex flex-wrap gap-3 pt-2">
								<AppButton
									onClick={() => navigate(-1)}
									disabled={isLoading}
									variant="secondary"
									className="flex-1"
								>
									Cancel
								</AppButton>

								<AppButton
									onClick={handleSave}
									disabled={!isFormValid || isLoading}
									className="flex-1"
								>
									{isLoading ? (
										<>
											<span className="animate-spin">
												<RefreshCcw size={18} />
											</span>
											<span>Saving...</span>
										</>
									) : (
										<>
											<Save size={18} />
											<span>Save</span>
										</>
									)}
								</AppButton>
							</div>
						</AppPanel>
					</div>
				</AppSurface>
			</motion.div>
		</AppPage>
	);
}
