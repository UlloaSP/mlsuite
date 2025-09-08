import { useMutation } from "@tanstack/react-query"

export interface Model {
    id: string
    name: string
    type: "classification" | "regression" | "clustering"
    accuracy: number
    lastTrained: string
    status: "active" | "training" | "inactive"
    fileName?: string
    createdAt: string
}

export interface Signature {
    id: string
    modelId: string
    name: string
    version: string
    createdAt: string
    inputFeatures: string[]
    outputType: "binary" | "multiclass" | "regression"
    performance: number
    status: "active" | "deprecated" | "testing"
    baseSignatureId?: string
    schema: SignatureSchema
}

export interface SignatureSchema {
    inputs: Record<
        string,
        {
            type: "number" | "string" | "boolean"
            required: boolean
            description?: string
            min?: number
            max?: number
            enum?: string[]
        }
    >
    output: {
        type: "number" | "string" | "boolean" | "array"
        description?: string
        classes?: string[]
    }
    metadata: {
        model_type: string
        version: string
        created_by: string
        description: string
    }
}

export interface Prediction {
    id: string
    signatureId: string
    timestamp: string
    inputs: Record<string, any>
    output: any
    confidence: number
    status: "correct" | "incorrect" | "pending"
    actualValue?: any
    executionTime: number
}

export interface CreateModel {
    id: string
    name: string
    blob: File
    createdAt: string
    updatedAt: string
}


export const CREATE_MODEL_QUERY_KEY = ["createModel"]

export function useCreateModelMutation() {
    return useMutation({
        mutationKey: CREATE_MODEL_QUERY_KEY,
        mutationFn: async (modelData: Omit<Model, "id" | "createdAt">) => {
            // Simulate API call
            return new Promise<Model>((resolve) => {
                setTimeout(() => {
                    resolve({
                        ...modelData,
                        id: crypto.randomUUID(),
                        createdAt: new Date().toISOString(),
                    })
                }, 1000)
            })
        },
    })
}