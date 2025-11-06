/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import {
	FileText,
	RefreshCcw,
	Save
} from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Unauthorized } from "../../app/pages/Unauthorized";
import { useUser } from "../../user/hooks";
import { CreateModelHeader } from "../components/CreateModelHeader";
import { CreateModelInfoSection } from "../components/CreateModelInfoSection";
import { UploadFile } from "../components/UploadFile";
import { useCreateModelMutation } from "../hooks";



const container = {
	hidden: { opacity: 0, x: -40 },
	show: {
		opacity: 1,
		x: 0,
		transition: { staggerChildren: 0.12, duration: 0.5 },
	},
};

export function CreateModelPage() {
	const [selectedModelFile, setSelectedModelFile] = useState<File | null>(null);
	const [selectedDataframeFile, setSelectedDataframeFile] =
		useState<File | null>(null);
	const [name, setName] = useState("");
	const [isLoading, setIsLoading] = useState(false);

	const mutation = useCreateModelMutation();
	const navigate = useNavigate();

	const { data: user, error } = useUser();

	const handleSave = async () => {
		if (!selectedModelFile || !name) return;

		setIsLoading(true);
		try {
			await mutation.mutateAsync({
				name,
				modelFile: selectedModelFile,
				dataframeFile: selectedDataframeFile ?? undefined,
			});
			navigate("/models");
		} catch (err) {
		} finally {
			setIsLoading(false);
		}
	};

	const isFormValid = selectedModelFile && name.trim();

	useEffect(() => {
		if (!selectedModelFile) return;
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


	if (!user || error) return <Unauthorized />;

	return (
		<div className="flex flex-1 size-full overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-slate-800 dark:to-indigo-900">
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.5 }}
				className="flex flex-1 overflow-hidden m-12 p-12 bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-md shadow-2xl border border-white/20 dark:border-gray-700/20"
			>
				<motion.span
					initial={{ opacity: 0, scale: 0.8 }}
					animate={{ opacity: 0.12, scale: 2 }}
					transition={{ repeat: Infinity, repeatType: "mirror", duration: 14 }}
					className="absolute top-1/3 -left-16 w-96 h-96 rounded-full bg-blue-600 blur-3xl pointer-events-none"
				/>
				<motion.span
					initial={{ opacity: 0, scale: 0.8 }}
					animate={{ opacity: 0.12, scale: 2 }}
					transition={{ repeat: Infinity, repeatType: "mirror", duration: 18 }}
					className="absolute bottom-10 -right-10 w-72 h-72 rounded-full bg-purple-700 blur-3xl pointer-events-none"
				/>
				<div className="flex flex-rows flex-1">
					<motion.div
						variants={container}
						initial="hidden"
						animate="show"
						className="grid grid-rows-[1fr_2fr] justify-between px-10"
					>
						<CreateModelHeader />
						<CreateModelInfoSection />
					</motion.div>

					{/* File Upload Section */}
					<div className="flex flex-col flex-1 justify-between px-10">
						<div>
							<label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
								Model File
							</label>
							<UploadFile
								acceptedFormats={[".joblib"]}
								selectedFile={selectedModelFile}
								setSelectedFile={setSelectedModelFile}
							/>
						</div>

						<div>
							<label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
								Model Dataframe (optional)
							</label>
							<UploadFile
								acceptedFormats={[".joblib"]}
								selectedFile={selectedDataframeFile}
								setSelectedFile={setSelectedDataframeFile}
							/>
						</div>

						{/* Model Name Input */}
						<div>
							<label
								htmlFor="model-name"
								className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3"
							>
								Model Name
							</label>
							<div className="relative">
								<FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
								<input
									id="model-name"
									type="text"
									value={name}
									onChange={(e) => setName(e.target.value)}
									placeholder="Introduce el nombre del modelo..."
									className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
								/>
							</div>
							{selectedModelFile && (
								<p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
									Name auto-filled from file. You can modify it if desired.
								</p>
							)}
						</div>

						{/* Action Buttons */}
						<div className="flex space-x-4 pt-6">
							<motion.button
								onClick={() => navigate(-1)}
								disabled={isLoading}
								className={`flex-1 px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${isLoading ? "cursor-not-allowed" : ""}`}
								whileHover={{ scale: 1.02 }}
								whileTap={{ scale: 0.98 }}
							>
								Cancel
							</motion.button>

							<motion.button
								onClick={handleSave}
								disabled={!isFormValid || isLoading}
								className={`flex-1 flex items-center justify-center space-x-2 px-6 py-3 ${isLoading ? "cursor-not-allowed" : ""} font-medium rounded-xl transition-all duration-300 ${isFormValid
									? "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl"
									: "bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed"
									}`}
								whileHover={isFormValid ? { scale: 1.02 } : {}}
								whileTap={isFormValid ? { scale: 0.98 } : {}}
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
							</motion.button>
						</div>
					</div>
				</div>
			</motion.div>
		</div>
	);
}
