import { useAtom } from "jotai";
import { MLForm } from "mlform";
import {
  BooleanStrategy,
  CategoryStrategy,
  ClassifierStrategy,
  DateStrategy,
  NumberStrategy,
  RegressorStrategy,
  TextStrategy,
} from "mlform/strategies";
import { AnimatePresence } from "motion/react";
import { useRef, useState } from "react";
import { schemaErrorsAtom } from "../../editor/atoms";
import { AnalyzerBodyHTML } from "./analyzer-body-html";
import { AnalyzerBodyJSON } from "./analyzer-body-json";
import { AnalyzerHeader } from "./analyzer-header";
import { InputsAnalyzer } from "./inputs-analyzer";

export function Analyzer() {
  const [modelFile, setModelFile] = useState<File | null>(null)
  const [dataFile, setDataFile] = useState<File | null>(null)
  const [showEditor, setShowEditor] = useState(false)
  const [schemaErrors, setSchemaErrors] = useAtom(schemaErrorsAtom);
  const [viewMode, setViewMode] = useState<"json" | "html">("json")
  const [isLoading, setIsLoading] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const f = new MLForm(`${import.meta.env.VITE_BACKEND_URL}/api/analyzer/predict/by-blob?modelBlob=${modelFile?.text}`);

  f.register(new DateStrategy());
  f.register(new RegressorStrategy());
  f.register(new ClassifierStrategy());
  f.register(new NumberStrategy());
  f.register(new TextStrategy());
  f.register(new CategoryStrategy());
  f.register(new BooleanStrategy());

  f.onSubmit((payload: unknown) => {
    console.log(payload);
    console.table(payload);
  });

  const [showSequence, setShowSequence] = useState({
    header: false,
    editor: false,
    footer: false,
  })
  const modelInputRef = useRef<HTMLInputElement>(null)
  const dataInputRef = useRef<HTMLInputElement>(null)

  // Collapse footer immediately when valid


  const handleFileAccept = async () => {
    if (!modelFile) return
    setIsLoading(true)

    // Sequential animation
    setTimeout(() => {
      setShowSequence((prev) => ({ ...prev, header: true }))
    }, 300)

    setTimeout(() => {
      setShowSequence((prev) => ({ ...prev, editor: true }))
    }, 800)

    // Simulate API call
    setTimeout(async () => {
      setShowEditor(true)
      setIsLoading(false)

      // Show footer after content loads
      setTimeout(() => {
        setShowSequence((prev) => ({ ...prev, footer: true }))
      }, 400)
    }, 1800)
  }

  const handleFileReselect = (type: "model" | "data") => {
    if (type === "model") {
      modelInputRef.current?.click()
    } else {
      dataInputRef.current?.click()
    }
  }

  const handleFileChange = (type: "model" | "data", file: File | null) => {
    if (type === "model") {
      setModelFile(file)
    } else {
      setDataFile(file)
    }

    // Reset to initial state
    setShowEditor(false)
    setSchemaErrors([])
    setViewMode("json")
    setShowSequence({
      header: false,
      editor: false,
      footer: false,
    })
  }

  const handleViewModeToggle = async () => {
    if (schemaErrors.length > 0) return

    if (viewMode === "json") {
      setIsProcessing(true)

      // Simulate API call to convert JSON to HTML
      await new Promise((resolve) => setTimeout(resolve, 1500))
      setViewMode("html")
      setIsProcessing(false)
    } else {
      setViewMode("json")
    }
  }

  return (
    <div className="h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-slate-800 dark:to-indigo-900">
      {/* Hidden file inputs */}
      <input
        ref={modelInputRef}
        type="file"
        accept=".*"
        onChange={(e) => handleFileChange("model", e.target.files?.[0] || null)}
        className="sr-only"
      />
      <input
        ref={dataInputRef}
        type="file"
        accept=".*"
        onChange={(e) => handleFileChange("data", e.target.files?.[0] || null)}
        className="sr-only"
      />

      <div className="h-screen flex flex-col bg-white dark:bg-gray-900 shadow-lg rounded-lg">
        <AnimatePresence mode="wait">
          {!showEditor ? (
            <InputsAnalyzer
              key="inputs"
              modelFile={modelFile}
              dataFile={dataFile}
              isLoading={isLoading}
              onModelFileChange={setModelFile}
              onDataFileChange={setDataFile}
              onAcceptFiles={handleFileAccept}
            />
          ) : (
            <>
              <AnalyzerHeader
                modelFile={modelFile}
                dataFile={dataFile}
                onModelFileReselect={() => handleFileReselect("model")}
                onDataFileReselect={() => handleFileReselect("data")}
                isVisible={showSequence.header && viewMode === "json"}
              />
              {showSequence.editor && viewMode === "json" && (
                <AnalyzerBodyJSON
                  isProcessing={isProcessing}
                  onToggleMode={handleViewModeToggle}
                />
              )}
              {showSequence.editor && viewMode === "html" && (
                <AnalyzerBodyHTML
                  mlform={f}
                  isProcessing={isProcessing}
                  onToggleMode={handleViewModeToggle}
                />
              )}
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
