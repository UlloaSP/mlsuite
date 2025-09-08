import {
	CheckCircle,
	ChevronDown,
	ChevronUp,
	Edit3,
	Save,
	X,
	XCircle,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import type { PredictionDto, TargetDto } from "../api/modelService";
import {
	useGetTargets,
	useUpdatePredictionMutation,
	useUpdateTargetMutation,
} from "../hooks";
import { ExportButton } from "./ExportButton";

interface PredictionDetailPanelProps {
	prediction: PredictionDto;
	isVisible: boolean;
	onClose: () => void;
}

export function PredictionDetailPanel({
	prediction,
	isVisible,
	onClose,
}: PredictionDetailPanelProps) {
	const [feedbackState, setFeedbackState] = useState<
		"COMPLETED" | "FAILED" | "PENDING"
	>("PENDING");
	const [actualValues, setActualValues] = useState<Record<string, string>>({});
	const [isEditing, setIsEditing] = useState(false);
	const [inputsOpen, setInputsOpen] = useState(false);
	const [correctValuesOpen, setCorrectValuesOpen] = useState(false);

	const [status, setStatus] = useState<"PENDING" | "COMPLETED" | "FAILED">(
		"PENDING",
	);
	const [, setValue] = useState<string>("");

	const mutation = useUpdatePredictionMutation();
	const mutationTarget = useUpdateTargetMutation();

	const { data: targs = [] } = useGetTargets({
		predictionId: prediction.id || "",
	});

	const navigate = useNavigate();

	const onUpdateFeedback = async () => {
		if (feedbackState === "FAILED") {
			targs.forEach(async (target: TargetDto) => {
				await mutationTarget.mutateAsync({
					targetId: target.id,
					realValue: actualValues[target.id].toString() as unknown as object,
				});
			});
		}

		await mutation.mutateAsync({
			predictionId: prediction.id,
			status: feedbackState?.toString(),
		});
		setFeedbackState("PENDING");
		setIsEditing(false);
		onClose();
	};

	useEffect(() => {
		setStatus(
			prediction.status.toString() as "PENDING" | "COMPLETED" | "FAILED",
		);
		let outputs: any[] = [];
		// @ts-ignore
		if (prediction.prediction && Array.isArray(prediction.prediction.outputs)) {
			// @ts-ignore
			outputs = prediction.prediction.outputs;
		}

		if (outputs.length > 0 && outputs[0]?.type === "classifier") {
			const probabilities = outputs[0].probabilities ?? [];
			if (Array.isArray(probabilities) && probabilities.length > 0) {
				const maxProb = probabilities[0].reduce(
					(max: number, current: number) => (current > max ? current : max),
					0,
				);
				setValue(maxProb);
			}
		} else if (outputs.length > 0 && outputs[0]?.type === "regressor") {
			const values = outputs[0].values ?? [];
			if (Array.isArray(values) && values.length > 0) {
				setValue(values.toString());
			}
		}
	}, [prediction]);

	useEffect(() => {
		if (!targs || targs.length === 0) return;
		setActualValues((prev) => {
			const next = { ...prev };
			for (const t of targs) {
				const k = String(t.id);
				if (next[k] === undefined) next[k] = ""; // or String(t.value) to prefill
			}
			return next;
		});
		console.log(targs);
	}, [targs]);

	if (!prediction) return null;

	const handleFeedbackSubmit = () => {
		if (feedbackState !== null) {
			onUpdateFeedback();
			setIsEditing(false);
		}
	};

	const formatInputValue = (value: any) => {
		if (typeof value === "number") {
			return value.toLocaleString();
		}
		return String(value);
	};

	const getOutputColor = () => {
		if (status === "COMPLETED") return "text-green-600 dark:text-green-400";
		if (status === "FAILED") return "text-red-600 dark:text-red-400";
		return "text-yellow-600 dark:text-yellow-400";
	};

	const formatExecutionTime = (time: number) => {
		if (time < 1000) {
			return `${time.toFixed(2).toLocaleString()} ms`;
		}
		if (time < 60000) {
			return `${(time / 1000).toFixed(2).toLocaleString()} s`;
		}
		if (time < 3600000) {
			return `${(time / 60000).toFixed(2).toLocaleString()} min`;
		}

		return `${(time / 3600000).toFixed(2).toLocaleString()} h`;
	};

	return (
		<AnimatePresence>
			{isVisible && (
				<>
					{/* Backdrop */}
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
						onClick={onClose}
					/>

					{/* Panel */}
					<motion.div
						initial={{ x: "100%", opacity: 0 }}
						animate={{ x: 0, opacity: 1 }}
						exit={{ x: "100%", opacity: 0 }}
						transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
						className="fixed right-0 top-0 h-full w-96 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 shadow-2xl z-50 flex flex-col"
					>
						{/* Header */}
						<div className="p-6 border-b border-gray-200 dark:border-gray-700">
							<div className="flex items-center justify-between">
								<h2 className="text-xl font-bold text-gray-900 dark:text-white">
									Prediction Details
								</h2>
								<button
									onClick={onClose}
									className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
								>
									<X size={20} className="text-gray-500 dark:text-gray-400" />
								</button>
							</div>
						</div>

						{/* Content */}
						<div className="flex-1 overflow-y-auto p-6 space-y-6">
							{/* Prediction Info */}
							<div className="space-y-4">
								<div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
									<h3 className="font-semibold text-gray-900 dark:text-white mb-3">
										{prediction.name}
									</h3>
									<div className="space-y-2">
										{targs.map((target: TargetDto) => (
											<div
												key={target.id}
												className="flex items-center justify-between"
											>
												<span className="text-sm text-gray-600 dark:text-gray-400">{`target_${target.order}:`}</span>
												<span
													className={`font-mono font-medium ${getOutputColor()}`}
												>
													{target.value.toString()}
												</span>
											</div>
										))}
										<div className="flex items-center justify-between">
											<span className="text-sm text-gray-600 dark:text-gray-400">
												Execution Time:
											</span>
											<span className="font-mono text-sm text-gray-900 dark:text-white">
												{
													/* @ts-ignore */
													formatExecutionTime(
														prediction.prediction.outputs[0].execution_time,
													)
												}
											</span>
										</div>
										<div className="flex items-center justify-between">
											<span className="text-sm text-gray-600 dark:text-gray-400">
												Timestamp:
											</span>
											<span className="font-mono text-sm text-gray-900 dark:text-white">
												{new Date(prediction.createdAt).toLocaleString()}
											</span>
										</div>
									</div>
								</div>
							</div>

							<motion.button
								type="button"
								initial={false}
								whileHover={{ scale: 1.015 }}
								whileTap={{ scale: 0.985 }}
								transition={{ type: "spring", stiffness: 400, damping: 30 }}
								className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-md
    bg-white text-gray-900 dark:bg-gray-900 dark:text-white
    ring-1 ring-violet-400/40 dark:ring-violet-400/35
    shadow-sm shadow-violet-500/10 hover:shadow-md hover:shadow-violet-500/20
    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/60
    relative isolate
    after:content-[''] after:absolute after:inset-0 after:-z-10 after:rounded-[inherit]
    after:bg-violet-500/20 dark:after:bg-violet-500/25 after:blur-xl after:opacity-0
    hover:after:opacity-100"
								onClick={() => {
									navigate(
										`/models/${prediction.modelId}/signatures/${prediction.signatureId}/predictions/create/${encodeURIComponent(JSON.stringify(prediction.inputs))}`,
									);
								}}
							>
								<motion.span className="text-sm">Predict</motion.span>
							</motion.button>

							{/* Input Features */}
							<div className="flex flex-col space-y-4">
								<button
									onClick={() => setInputsOpen(!inputsOpen)}
									className="flex flex-row flex-1 items-center justify-between text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
								>
									<h3 className="font-semibold text-gray-900 dark:text-white">
										Input Features
									</h3>
									{inputsOpen ? <ChevronUp /> : <ChevronDown />}
								</button>
								{inputsOpen && (
									<div className="space-y-3">
										{Object.entries(prediction.inputs).map(([key, value]) => (
											<div
												key={key}
												className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3"
											>
												<div className="flex items-center justify-between">
													<span className="text-sm font-medium text-gray-700 dark:text-gray-300">
														{key}:
													</span>
													<span className="font-mono text-sm text-gray-900 dark:text-white">
														{formatInputValue(value)}
													</span>
												</div>
											</div>
										))}
									</div>
								)}
							</div>

							{/* Exports Section */}
							<div className="space-y-4"></div>
							<h3 className="font-semibold text-gray-900 dark:text-white">
								Export
							</h3>
							<ExportButton
								name={prediction.name}
								inputs={prediction.inputs}
								targs={targs}
							/>

							{/* Feedback Section */}
							<div className="space-y-4">
								<div className="flex items-center justify-between">
									<h3 className="font-semibold text-gray-900 dark:text-white">
										Prediction Feedback
									</h3>
									{status !== "PENDING" && !isEditing && (
										<button
											onClick={() => setIsEditing(true)}
											className="flex items-center space-x-1 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
										>
											<Edit3 size={14} />
											<span>Edit</span>
										</button>
									)}
								</div>

								{status === "PENDING" || isEditing ? (
									<div className="space-y-4">
										<div className="text-sm text-gray-600 dark:text-gray-400 mb-3">
											Was this prediction correct?
										</div>

										<div className="flex space-x-3">
											<motion.button
												onClick={() => setFeedbackState("COMPLETED")}
												className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-lg border transition-all duration-200 ${
													feedbackState === "COMPLETED"
														? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700 text-green-700 dark:text-green-400"
														: "border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
												}`}
												whileHover={{ scale: 1.02 }}
												whileTap={{ scale: 0.98 }}
											>
												<CheckCircle size={18} />
												<span>Yes</span>
											</motion.button>

											<motion.button
												onClick={() => setFeedbackState("FAILED")}
												className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-lg border transition-all duration-200 ${
													feedbackState === "FAILED"
														? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700 text-red-700 dark:text-red-400"
														: "border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
												}`}
												whileHover={{ scale: 1.02 }}
												whileTap={{ scale: 0.98 }}
											>
												<XCircle size={18} />
												<span>No</span>
											</motion.button>
										</div>

										<AnimatePresence>
											{feedbackState === "FAILED" && (
												<motion.div
													initial={{ height: 0, opacity: 0 }}
													animate={{ height: "auto", opacity: 1 }}
													exit={{ height: 0, opacity: 0 }}
													transition={{ duration: 0.3 }}
													className="overflow-hidden"
												>
													{targs.map((target: TargetDto) => (
														<div key={target.id} className="space-y-3">
															<label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
																Ground Truth Value target_{target.order}:
															</label>
															<input
																type="text"
																value={actualValues[target.id]}
																onChange={(e) =>
																	setActualValues((prev) => ({
																		...prev,
																		[target.id]: e.target.value,
																	}))
																}
																placeholder="Introduce el valor correcto..."
																className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
															/>
														</div>
													))}
												</motion.div>
											)}
										</AnimatePresence>

										{feedbackState && (
											<motion.button
												onClick={handleFeedbackSubmit}
												className="w-full flex items-center justify-center space-x-2 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
												initial={{ opacity: 0, y: 10 }}
												animate={{ opacity: 1, y: 0 }}
												whileHover={{ scale: 1.02 }}
												whileTap={{ scale: 0.98 }}
											>
												<Save size={18} />
												<span>Save Feedback</span>
											</motion.button>
										)}
									</div>
								) : (
									<div className="flex flex-col gap-2 bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
										<div className="flex items-center space-x-2">
											{status === "COMPLETED" ? (
												<CheckCircle size={16} className="text-green-500" />
											) : (
												<XCircle size={16} className="text-red-500" />
											)}
											<span className="text-sm font-medium text-gray-900 dark:text-white">
												{status}
											</span>
										</div>

										{status === "FAILED" && (
											<div className="space-y-2">
												<button
													onClick={() =>
														setCorrectValuesOpen(!correctValuesOpen)
													}
													className="flex items-center justify-between w-full text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
												>
													<span>Corrected Values</span>
													{correctValuesOpen ? (
														<ChevronUp size={16} />
													) : (
														<ChevronDown size={16} />
													)}
												</button>
												<AnimatePresence>
													{correctValuesOpen && (
														<motion.div
															initial={{ height: 0, opacity: 0 }}
															animate={{ height: "auto", opacity: 1 }}
															exit={{ height: 0, opacity: 0 }}
															transition={{ duration: 0.3 }}
															className="overflow-hidden"
														>
															<div className="max-h-32 overflow-y-auto space-y-2 pr-2">
																{targs.map((target: TargetDto) => (
																	<div
																		key={target.id}
																		className="flex items-center justify-between"
																	>
																		<span className="text-sm text-gray-600 dark:text-gray-400">{`target_${target.order}:`}</span>
																		<span
																			className={`font-mono font-medium text-green-600 dark:text-green-400`}
																		>
																			{target.realValue?.toString()}
																		</span>
																	</div>
																))}
															</div>
														</motion.div>
													)}
												</AnimatePresence>
											</div>
										)}
									</div>
								)}
							</div>
						</div>
					</motion.div>
				</>
			)}
		</AnimatePresence>
	);
}
