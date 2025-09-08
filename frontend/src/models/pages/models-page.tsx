import { motion } from "motion/react"
import { useState } from "react"
import { useNavigate } from "react-router"
import { Column } from "../components/Column"
import { ModelCard } from "../components/ModelCard"
import { PredictionCard } from "../components/PredictionCard"
import { PredictionDetailPanel } from "../components/PredictionDetailsPanel"
import { SignatureCard } from "../components/SignatureCard"
import { useGetModels, useGetPredictions, useGetSignatures } from "../hooks"

export function ModelsPage() {
    const navigate = useNavigate();
    const [selectedModelId, setSelectedModelId] = useState<string>("");
    const [selectedSignatureId, setSelectedSignatureId] = useState<string>("")
    const [selectedPredictionId, setSelectedPredictionId] = useState<string>("")
    const { data: models = [] } = useGetModels();
    const { data: signatures = [] } = useGetSignatures({ modelId: selectedModelId });
    const { data: predictions = [] } = useGetPredictions({ signatureId: selectedSignatureId });

    const handleModelSelect = (modelId: string) => {
        setSelectedModelId(modelId)
        setSelectedSignatureId("")
        setSelectedPredictionId("")
    }

    const handleSignatureSelect = (signatureId: string) => {
        setSelectedSignatureId(signatureId)
        setSelectedPredictionId("")
    }

    const handlePredictionSelect = (predictionId: string) => {
        setSelectedPredictionId(predictionId)
    }

    return (
        <motion.div className="flex flex-1 size-full overflow-hidden bg-gradient-to-br from-slate-50 via-green-50 to-amber-50 dark:from-gray-900 dark:via-slate-800 dark:to-amber-500">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="grid grid-cols-3 gap-4 flex-1 overflow-hidden m-12 p-12 bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-md shadow-2xl border border-white/20 dark:border-gray-700/20"
            >
                {/* Models Column - Always visible */}
                <Column
                    title="Machine Learning Models"
                    onClick={() => navigate("/models/create")}
                    items={models}
                    selectedItemId={selectedModelId}
                    onItemSelect={handleModelSelect}
                    cardComponent={ModelCard}
                />

                {/* Signatures Column - Visible when model is selected */}
                {!!selectedModelId && (
                    <Column
                        key={`signatures-${selectedModelId}`}
                        title="Model Signatures"
                        onClick={() => navigate(`/models/${selectedModelId}/signatures/create`)}
                        items={signatures}
                        selectedItemId={selectedSignatureId}
                        onItemSelect={handleSignatureSelect}
                        cardComponent={SignatureCard}
                    />
                )}

                {/* Predictions Column - Visible when signature is selected */}
                {!!selectedModelId && !!selectedSignatureId && (

                    <Column
                        key={`predictions-${selectedSignatureId}`}
                        title="Prediction History"
                        onClick={() => navigate(`/models/${selectedModelId}/signatures/${selectedSignatureId}/predictions/create`)}
                        items={predictions}
                        selectedItemId={selectedPredictionId}
                        onItemSelect={handlePredictionSelect}
                        cardComponent={PredictionCard}
                    />
                )}
                {!!selectedModelId && !!selectedSignatureId && !!selectedPredictionId && (
                    <PredictionDetailPanel
                        key={`results-${selectedPredictionId}`}
                        prediction={predictions.find(p => p.id === selectedPredictionId)!}
                        isVisible={!!selectedPredictionId}
                        onClose={() => setSelectedPredictionId("")}
                    />
                )}
            </motion.div>
        </motion.div>
    )
}
