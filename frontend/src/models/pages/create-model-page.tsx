import {
	ArrowLeft,
	FileText,
	RefreshCcw,
	Save,
	Table2,
	Type,
	UploadCloud,
} from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Unauthorized } from "../../app/pages/Unauthorized";
import { useUser } from "../../user/hooks";
import { UploadFile } from "../components/UploadFile";
import { useCreateModelMutation } from "../hooks";

const CREATE_MODEL_HEADER = "Create New Model";
const CREATE_MODEL_SUBHEADER =
	"Upload your model file and configure its details.";

const container = {
	hidden: { opacity: 0, x: -40 },
	show: {
		opacity: 1,
		x: 0,
		transition: { staggerChildren: 0.12, duration: 0.5 },
	},
};

const item = {
	hidden: { opacity: 0, y: 20 },
	show: { opacity: 1, y: 0 },
};

const steps = [
	{ icon: UploadCloud, label: "Upload model file" },
	{ icon: Table2, label: "Attach dataframe (optional)" },
	{ icon: Type, label: "Model name auto-filled" },
	{ icon: Save, label: "Save model" },
];

export function CreateModelPage() {
	const [selectedModelFile, setSelectedModelFile] = useState<File | null>(null);
	const [selectedDataframeFile, setSelectedDataframeFile] =
		useState<File | null>(null);
	const [name, setName] = useState("");
	const [isLoading, setIsLoading] = useState(false);

	const mutation = useCreateModelMutation();
	const navigate = useNavigate();

	const { data: user, error } = useUser();
	if (!user || error) return <Unauthorized />;

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
			console.error("Error creating model:", err);
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
						className="flex flex-1 flex-col justify-between px-10"
					>
						<motion.div
							variants={item}
							className="flex-start justify-self-start flex flex-col gap-4"
						>
							<motion.button
								variants={item}
								onClick={() => navigate("/models")}
								className="self-start inline-flex items-center gap-2 text-sm font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer"
							>
								<ArrowLeft size={18} />
								Back
							</motion.button>

							{/* Title */}
							<motion.h1
								variants={item}
								className="text-6xl font-bold bg-gradient-to-r from-gray-900 to-blue-600 dark:from-white dark:to-blue-400 bg-clip-text text-transparent"
							>
								{CREATE_MODEL_HEADER}
							</motion.h1>

							{/* Subtitle */}
							<motion.p variants={item} className="text-slate-400">
								{CREATE_MODEL_SUBHEADER}
							</motion.p>
						</motion.div>
						<motion.ul
							variants={container}
							initial="hidden"
							animate="show"
							className="flex-center justify-self-center space-y-7"
						>
							{steps.map(({ icon: Icon, label }, idx) => (
								<motion.li
									key={idx}
									variants={item}
									className="flex items-center gap-3"
								>
									<span className="flex items-center justify-center w-12 h-12 rounded-full bg-slate-800/60 backdrop-blur ring-1 ring-inset ring-slate-700 shadow-inner">
										<Icon size={22} />
									</span>
									<span className="text-sm md:text-base text-slate-300">
										{label}
									</span>
								</motion.li>
							))}
						</motion.ul>

						{/* Best‑practice card */}
						<motion.div
							variants={item}
							className="flex-end justify-self-end max-w-fit p-4 rounded-2xl bg-slate-800/50 backdrop-blur-sm ring-1 ring-inset ring-slate-700 shadow-md"
						>
							<h2 className="text-slate-200 font-semibold mb-2 text-sm">
								Upload best practices
							</h2>
							<ul className="list-disc list-inside text-xs text-slate-400 space-y-1">
								<li>Ensure the file is under 100&nbsp;MB.</li>
								<li>Version your model before uploading.</li>
								<li>
									Provide the final feature set in the optional dataframe.
								</li>
							</ul>
						</motion.div>
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
								className="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
								whileHover={{ scale: 1.02 }}
								whileTap={{ scale: 0.98 }}
							>
								Cancel
							</motion.button>

							<motion.button
								onClick={handleSave}
								disabled={!isFormValid || isLoading}
								className={`flex-1 flex items-center justify-center space-x-2 px-6 py-3 font-medium rounded-xl transition-all duration-300 ${isFormValid
									? "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl"
									: "bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed"
									}`}
								whileHover={isFormValid ? { scale: 1.02 } : {}}
								whileTap={isFormValid ? { scale: 0.98 } : {}}
							>
								{isLoading ? (
									<span className="animate-spin">
										<RefreshCcw size={18} />
									</span>
								) : (
									<Save size={18} />
								)}
								<span>Save</span>
							</motion.button>
						</div>
					</div>
				</div>
			</motion.div>
		</div>
	);
}
