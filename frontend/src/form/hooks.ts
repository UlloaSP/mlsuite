import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import * as analyzerApi from "./api/analyzerService";

export const mockHtmlContent = `
        <div class="model-analysis-report p-8 space-y-8 bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-slate-800 min-h-full">
          <div class="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl p-8 rounded-2xl shadow-xl border border-white/20 dark:border-gray-700/20">
            <h2 class="text-3xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Model Analysis Report</h2>
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div class="space-y-4">
                <h3 class="font-semibold text-blue-800 dark:text-blue-200 text-xl">Model Information</h3>
                <div class="space-y-3 text-sm bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl">
                  <p><span class="font-medium text-gray-700 dark:text-gray-300">Name:</span> <span class="font-mono text-blue-600 dark:text-blue-400">advanced-churn-predictor</span></p>
                  <p><span class="font-medium text-gray-700 dark:text-gray-300">Type:</span> <span class="capitalize">Classification</span></p>
                  <p><span class="font-medium text-gray-700 dark:text-gray-300">Version:</span> <span class="font-mono">2.1.0</span></p>
                  <p><span class="font-medium text-gray-700 dark:text-gray-300">Accuracy:</span> <span class="text-green-600 dark:text-green-400 font-bold">89.2%</span></p>
                </div>
              </div>
              <div class="space-y-4">
                <h3 class="font-semibold text-green-800 dark:text-green-200 text-xl">Dataset Information</h3>
                <div class="space-y-3 text-sm bg-green-50 dark:bg-green-900/20 p-4 rounded-xl">
                  <p><span class="font-medium text-gray-700 dark:text-gray-300">Rows:</span> <span class="font-mono">7,043</span></p>
                  <p><span class="font-medium text-gray-700 dark:text-gray-300">Columns:</span> <span class="font-mono">21</span></p>
                  <p><span class="font-medium text-gray-700 dark:text-gray-300">Missing Values:</span> <span class="text-orange-600 dark:text-orange-400">11</span></p>
                  <p><span class="font-medium text-gray-700 dark:text-gray-300">Memory Usage:</span> <span class="font-mono">1.2 MB</span></p>
                </div>
              </div>
            </div>
          </div>
          
          <div class="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl p-8 rounded-2xl shadow-xl border border-white/20 dark:border-gray-700/20">
            <h3 class="font-semibold text-green-800 dark:text-green-200 text-xl mb-6">Performance Metrics</h3>
            <div class="grid grid-cols-2 lg:grid-cols-4 gap-6">
              <div class="text-center p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl">
                <div class="text-3xl font-bold text-green-700 dark:text-green-300 mb-2">84%</div>
                <div class="text-sm text-green-600 dark:text-green-400 font-medium">Precision</div>
              </div>
              <div class="text-center p-4 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-xl">
                <div class="text-3xl font-bold text-blue-700 dark:text-blue-300 mb-2">79%</div>
                <div class="text-sm text-blue-600 dark:text-blue-400 font-medium">Recall</div>
              </div>
              <div class="text-center p-4 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl">
                <div class="text-3xl font-bold text-purple-700 dark:text-purple-300 mb-2">81%</div>
                <div class="text-sm text-purple-600 dark:text-purple-400 font-medium">F1 Score</div>
              </div>
              <div class="text-center p-4 bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 rounded-xl">
                <div class="text-3xl font-bold text-orange-700 dark:text-orange-300 mb-2">76%</div>
                <div class="text-sm text-orange-600 dark:text-orange-400 font-medium">R² Score</div>
              </div>
            </div>
          </div>
          
          <div class="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl p-8 rounded-2xl shadow-xl border border-white/20 dark:border-gray-700/20">
            <h3 class="font-semibold text-purple-800 dark:text-purple-200 text-xl mb-6">Feature Importance</h3>
            <div class="space-y-4">
              ${Object.entries({
  "Total Charges": 35,
  "Monthly Charges": 28,
  Tenure: 22,
  "Contract Type": 10,
  Age: 5,
})
    .map(
      ([feature, importance]) => `
                <div class="flex items-center justify-between p-3 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl">
                  <span class="text-sm font-medium text-purple-700 dark:text-purple-300">${feature}</span>
                  <div class="flex items-center space-x-3">
                    <div class="w-40 bg-purple-200 dark:bg-purple-800 rounded-full h-3 overflow-hidden">
                      <div class="bg-gradient-to-r from-purple-500 to-pink-500 h-full rounded-full transition-all duration-1000 shadow-sm" style="width: ${importance}%"></div>
                    </div>
                    <span class="text-sm text-purple-600 dark:text-purple-400 font-mono w-10 text-right">${importance}%</span>
                  </div>
                </div>
              `,
    )
    .join("")}
            </div>
          </div>
        </div>
      `

export const mockJsonData = `{
  "model": {
    "name": "advanced-churn-predictor",
    "type": "classification",
    "version": "2.1.0",
    "accuracy": 0.892,
    "features": ["age", "tenure", "monthly_charges", "total_charges", "contract_type", "payment_method", "internet_service"],
    "parameters": {
      "n_estimators": 100,
      "max_depth": 8,
      "learning_rate": 0.1
    }
  },
  "dataset": {
    "name": "customer_churn_dataset.csv",
    "rows": 7043,
    "columns": 21,
    "missing_values": 11,
    "dtypes": {
      "age": "int64",
      "tenure": "int64",
      "monthly_charges": "float64",
      "total_charges": "float64",
      "contract_type": "object",
      "payment_method": "object",
      "internet_service": "object"
    },
    "memory_usage": 1.2
  },
  "analysis": {
    "feature_importance": {
      "total_charges": 0.35,
      "monthly_charges": 0.28,
      "tenure": 0.22,
      "contract_type": 0.10,
      "age": 0.05
    },
    "correlation_matrix": {
      "age": {
        "age": 1.0,
        "tenure": 0.13,
        "monthly_charges": 0.25
      },
      "tenure": {
        "age": 0.13,
        "tenure": 1.0,
        "monthly_charges": 0.25
      }
    },
    "performance_metrics": {
      "precision": 0.84,
      "recall": 0.79,
      "f1_score": 0.81,
      "r2_score": 0.76
    },
    "cross_validation": {
      "cv_scores": [0.85, 0.87, 0.89, 0.86, 0.88],
      "mean_score": 0.87,
      "std_score": 0.015
    }
  },
  "predictions": [
    {
      "input": {
        "age": 45,
        "tenure": 24,
        "monthly_charges": 79.85,
        "total_charges": 1889.5,
        "contract_type": "Month-to-month"
      },
      "output": "Churn",
      "confidence": 0.73,
      "prediction_time": 0.002
    }
  ]
}`


export // Zod schema for model analysis
  const ModelAnalysisSchema = z.object({
    model: z.object({
      name: z.string().min(1, "Model name is required"),
      type: z.enum(["classification", "regression", "clustering"], {
        message: "Model type must be classification, regression, or clustering",
      }),
      version: z.string().regex(/^\d+\.\d+\.\d+$/, "Version must be in semver format"),
      accuracy: z.number().min(0).max(1, "Accuracy must be between 0 and 1"),
      features: z.array(z.string()).min(1, "At least one feature is required"),
      parameters: z.object({
        n_estimators: z.number().int().positive().optional(),
        max_depth: z.number().int().positive().optional(),
        learning_rate: z.number().positive().optional(),
      }),
    }),
    dataset: z.object({
      name: z.string().min(1, "Dataset name is required"),
      rows: z.number().int().positive("Rows must be a positive integer"),
      columns: z.number().int().positive("Columns must be a positive integer"),
      missing_values: z.number().int().min(0, "Missing values cannot be negative"),
      dtypes: z.record(z.string(), z.enum(["int64", "float64", "object", "bool", "datetime64"])),
      memory_usage: z.number().positive("Memory usage must be positive"),
    }),
    analysis: z.object({
      feature_importance: z.record(z.string(), z.number().min(0).max(1)),
      correlation_matrix: z.record(z.string(), z.record(z.string(), z.number().min(-1).max(1))),
      performance_metrics: z.object({
        precision: z.number().min(0).max(1).optional(),
        recall: z.number().min(0).max(1).optional(),
        f1_score: z.number().min(0).max(1).optional(),
        mse: z.number().min(0).optional(),
        rmse: z.number().min(0).optional(),
        r2_score: z.number().optional(),
      }),
      cross_validation: z.object({
        cv_scores: z.array(z.number().min(0).max(1)),
        mean_score: z.number().min(0).max(1),
        std_score: z.number().min(0),
      }),
    }),
    predictions: z.array(
      z.object({
        input: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
        output: z.union([z.string(), z.number()]),
        confidence: z.number().min(0).max(1),
        prediction_time: z.number().positive(),
      }),
    ),
  })

type Params = { model: File; dataframe?: File | null };


export const ANALYZER_QUERY_KEY = ["schema"];

export function useGenerateSchemaMutation(
  onSuccess?: (schema: unknown) => void
) {
  return useMutation({
    mutationKey: ANALYZER_QUERY_KEY,
    mutationFn: ({ model, dataframe }: Params) =>
      analyzerApi.generateSchema(model, dataframe ?? undefined),
    onSuccess,
    onError: (err) => {
      console.error("generateSchema failed", err);
    },
  });
}