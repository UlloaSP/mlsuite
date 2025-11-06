/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useAtom } from "jotai";
import { Save, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { useParams } from "react-router";
import { showModalAtom } from "../atoms";
import { useCreatePredictionMutation, useCreateTargetMutation } from "../hooks";

export type CreatePredictionModalProps = {
	prediction: Record<string, object>;
	inputs: Record<string, object>;
};

export function CreatePredictionModal({
	prediction,
	inputs,
}: CreatePredictionModalProps) {
	const { signatureId } = useParams<{ signatureId: string }>();

	const [, setShowModal] = useAtom(showModalAtom);

	const mutation = useCreatePredictionMutation();
	const mutationTarget = useCreateTargetMutation();

	const [predictionName, setPredictionName] = useState<string>("");
	const [targets, setTargets] = useState<Record<number, object>>({});

	const formatInputValue = (value: any) => {
		if (typeof value === "number") {
			return value.toLocaleString();
		}
		return String(value);
	};

	useEffect(() => {
		// @ts-ignore
		if (!prediction || !prediction.outputs || prediction.outputs.length === 0) {
			return;
		}
		// @ts-ignore
		const output = prediction.outputs[0];

		const targets: Record<number, number | string> = {};

		if (output.type === "classifier") {
			output.probabilities.forEach((target: number[], index: number) => {
				const maxIndex = target.indexOf(Math.max(...target));
				targets[index] = output.mapping[maxIndex];
			});
		}

		if (output.type === "regressor") {
			output.values.forEach((target: number, index: number) => {
				targets[index] = target;
			});
		}
		setTargets(targets as unknown as Record<number, object>);
	}, [prediction]);

	const handleSave = async () => {
		const created = await mutation.mutateAsync({
			signatureId: signatureId!,
			name: predictionName,
			inputs: inputs,
			prediction: prediction,
		});

		Object.entries(targets).forEach(async ([key, value]) => {
			await mutationTarget.mutateAsync({
				predictionId: created.id,
				order: Number(key),
				value: String(value),
			});
		});

		setShowModal(false);
	};

	return (
		<AnimatePresence>
			<motion.div
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				exit={{ opacity: 0 }}
				className="fixed flex inset-0 bg-black/50 backdrop-blur-sm z-40"
				onClick={() => setShowModal(false)}
			>
				<motion.div
					initial={{ x: "100%", opacity: 0 }}
					animate={{ x: 0, opacity: 1 }}
					exit={{ x: "100%", opacity: 0 }}
					transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
					className="relative flex flex-col flex-1 m-12 rounded-md bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 shadow-2xl z-50"
					onClick={(e) => e.stopPropagation()}
				>
					<motion.div className="flex flex-row justify-between items-center p-8">
						<motion.h1 className="text-5xl leading-20 font-bold bg-gradient-to-r from-gray-900 to-violet-600 dark:from-white dark:to-violet-400 bg-clip-text text-transparent">
							Create New Prediction
						</motion.h1>
						<motion.button
							type="button"
							aria-label="Close modal"
							onClick={() => setShowModal(false)}
							whileHover={{ scale: 1.05 }}
							whileTap={{ scale: 0.95 }}
							className="place-content-end max-w-fit p-3 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-300 dark:focus:ring-gray-600 dark:focus:ring-offset-gray-900"
						>
							<X size={24} />
						</motion.button>
					</motion.div>
					<motion.div className="flex flex-row flex-1 overflow-hidden">
						{/* Columna Izquierda */}
						<motion.div className="flex flex-col flex-1 p-8 gap-8 overflow-hidden">
							{/* Details */}
							<motion.div className="min-h-fit bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
								<motion.div className="flex items-center justify-between ">
									<motion.span className="text-sm font-semibold text-gray-600 dark:text-gray-400">
										Type:
									</motion.span>
									<motion.span
										className={`font-mono font-medium text-gray-800 dark:text-gray-200`}
									>
										{/* @ts-ignore */}
										{prediction.outputs[0]?.type || "N/A"}
									</motion.span>
								</motion.div>
								<motion.div className="flex items-center justify-between">
									<motion.span className="text-sm font-semibold text-gray-600 dark:text-gray-400">
										Execution Time:
									</motion.span>
									<motion.span
										className={`font-mono font-medium text-gray-800 dark:text-gray-200`}
									>
										{/* @ts-ignore */}
										{prediction.outputs[0]?.execution_time || "N/A"}
									</motion.span>
								</motion.div>
								<motion.div className="flex items-center justify-between">
									<motion.span className="text-sm font-semibold text-gray-600 dark:text-gray-400">
										Status:
									</motion.span>
									<motion.span
										className={`font-mono font-medium text-gray-800 dark:text-gray-200`}
									>
										{"pending"}
									</motion.span>
								</motion.div>
							</motion.div>
							{/* Inputs */}
							<motion.div className="flex flex-col flex-1 space-y-4 overflow-hidden bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
								<h3 className="font-semibold text-gray-900 dark:text-white">
									Input Features
								</h3>
								<div className="space-y-3 overflow-y-auto">
									{Object.entries(inputs).map(([key, value]) => (
										<div
											key={key}
											className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 rounded-lg p-3"
										>
											<span className="text-sm font-medium text-gray-700 dark:text-gray-300">
												{key}:
											</span>
											<span className="font-mono text-sm text-gray-900 dark:text-white">
												{formatInputValue(value)}
											</span>
										</div>
									))}
								</div>
							</motion.div>
						</motion.div>
						{/* Columna Derecha*/}
						<motion.div className="flex flex-col flex-1 gap-8 p-8 overflow-hidden">
							{/* Targets */}
							<motion.div className="flex flex-col flex-1 space-y-4 overflow-hidden bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
								<h3 className="font-semibold text-gray-900 dark:text-white">
									Targets
								</h3>
								<motion.div className="space-y-3 overflow-y-auto">
									{Object.entries(targets).map(([key, value]) => (
										<motion.div
											key={key}
											className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 rounded-lg p-3"
										>
											<motion.span className="text-sm font-medium text-gray-700 dark:text-gray-300">
												target_{key}:
											</motion.span>
											<motion.span className="font-mono text-sm text-gray-900 dark:text-white">
												{value.toString()}
											</motion.span>
										</motion.div>
									))}
								</motion.div>
							</motion.div>

							<motion.div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
								{/* Name */}
								<motion.div className="mb-3">
									<motion.label
										htmlFor="prediction-name"
										className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3"
									>
										Prediction Name
									</motion.label>
									<motion.input
										id="prediction-name"
										type="text"
										value={predictionName}
										onChange={(e) => setPredictionName(e.target.value)}
										placeholder="Ex: Customer Churn v2.0"
										className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-transparent"
									/>
								</motion.div>

								{/* Actions */}
								<motion.div className="flex space-x-4 pt-6">
									<motion.button
										onClick={() => setShowModal(false)}
										className="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
										whileHover={{ scale: 1.02 }}
										whileTap={{ scale: 0.98 }}
									>
										Cancel
									</motion.button>

									<motion.button
										onClick={handleSave}
										disabled={!predictionName}
										className={`flex-1 flex items-center justify-center space-x-2 px-6 py-3 font-medium rounded-xl transition-all duration-300 ${predictionName
											? "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl"
											: "bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed"
											}`}
										whileHover={predictionName ? { scale: 1.02 } : {}}
										whileTap={predictionName ? { scale: 0.98 } : {}}
									>
										<Save size={18} />
										<span>Save Prediction</span>
									</motion.button>
								</motion.div>
							</motion.div>
						</motion.div>
					</motion.div>
				</motion.div>
			</motion.div>
		</AnimatePresence>
	);
}
