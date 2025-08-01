import { useState } from "react"
import { useNavigate } from "react-router"
import { Column } from "../components/Column"
import { ModelCard } from "../components/ModelCard"
import { PredictionCard } from "../components/PredictionCard"
import { PredictionDetailPanel } from "../components/PredictionDetailsPanel"
import { SignatureCard } from "../components/SignatureCard"
import { mockModels, mockPredictions, mockSignatures } from "../mockData"

export function ModelsPage() {
    const navigate = useNavigate();
    const [selectedModelId, setSelectedModelId] = useState<string | null>(null)
    const [selectedSignatureId, setSelectedSignatureId] = useState<string | null>(null)
    const [selectedPredictionId, setSelectedPredictionId] = useState<string | null>(null)
    const [predictions, setPredictions] = useState(mockPredictions)

    const handleModelSelect = (modelId: string) => {
        setSelectedModelId(modelId)
        setSelectedSignatureId(null)
        setSelectedPredictionId(null)
    }

    const handleSignatureSelect = (signatureId: string) => {
        setSelectedSignatureId(signatureId)
        setSelectedPredictionId(null)
    }

    const handlePredictionSelect = (predictionId: string) => {
        setSelectedPredictionId(predictionId)
    }

    const handleUpdateFeedback = (predictionId: string, isCorrect: boolean, actualValue?: any) => {
        setPredictions((prev) =>
            prev.map((prediction) =>
                prediction.id === predictionId
                    ? {
                        ...prediction,
                        status: isCorrect ? "correct" : "incorrect",
                        actualValue: actualValue || undefined,
                    }
                    : prediction,
            ),
        )
    }

    // Get signatures for selected model
    const modelSignatures = selectedModelId ? mockSignatures.filter((sig) => sig.modelId === selectedModelId) : []

    // Get predictions for selected signature
    const signaturePredictions = selectedSignatureId
        ? predictions.filter((pred) => pred.signatureId === selectedSignatureId)
        : []

    const selectedPrediction = selectedPredictionId
        ? predictions.find((p) => p.id === selectedPredictionId) || null
        : null

    return (
        <div className={`grid grid-cols-3 gap-0 h-full bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-slate-800 dark:to-indigo-900 flex overflow-hidden`}>
            {/* Models Column - Always visible */}
            <Column
                title="Machine Learning Models"
                onClick={() => navigate("/models/create")}
                label="New Model"
                items={mockModels}
                selectedItemId={selectedModelId}
                onItemSelect={handleModelSelect}
                cardComponent={ModelCard}
            />

            {/* Signatures Column - Visible when model is selected */}
            {!!selectedModelId && (
                <Column
                    title="Model Signatures"
                    onClick={() => navigate("/models/signatures/create")}
                    label="New Signature"
                    items={modelSignatures}
                    selectedItemId={selectedSignatureId}
                    onItemSelect={handleSignatureSelect}
                    cardComponent={SignatureCard}
                />
            )}

            {/* Predictions Column - Visible when signature is selected */}
            {!!selectedSignatureId && (
                <Column
                    title="Prediction History"
                    onClick={() => navigate("/models/predictions/create")}
                    label="New Prediction"
                    items={signaturePredictions}
                    selectedItemId={selectedPredictionId}
                    onItemSelect={handlePredictionSelect}
                    cardComponent={PredictionCard}
                />
            )}

            {/* Prediction Detail Panel */}
            <PredictionDetailPanel
                prediction={selectedPrediction}
                isVisible={!!selectedPrediction}
                onClose={() => setSelectedPredictionId(null)}
                onUpdateFeedback={handleUpdateFeedback}
            />
        </div>
    )
}
