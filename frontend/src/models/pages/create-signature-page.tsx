import { motion } from "framer-motion"
import { ArrowLeft, CheckCircle, FileJson, GitGraph, Layers, Save, Type } from "lucide-react"
import { useEffect, useState } from "react"
import { useNavigate } from "react-router"
import { EditorWrapper } from "../../editor/components/EditorWrapper.tsx"
import { mockSignatures } from "../mockData"

const CREATE_SIGNATURE_HEADER = "Create New Signature"
const CREATE_SIGNATURE_SUBHEADER = "Define the schema for your model's inputs"


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
    { icon: Layers, label: "Select base version" },
    { icon: Type, label: "Name the signature" },
    { icon: GitGraph, label: "Version the signature" },
    { icon: FileJson, label: "Edit JSON signature" },
    { icon: CheckCircle, label: "Validate signature" },
    { icon: Save, label: "Save signature" },
];

export function CreateSignaturePage() {
    const navigate = useNavigate()
    const [selectedBaseSignature, setSelectedBaseSignature] = useState<string>("")
    const [signatureName, setSignatureName] = useState("")
    const [version, setVersion] = useState("")
    const [, setJsonContent] = useState("")
    const [isValid,] = useState(false)

    // Get signatures for the current model
    const modelSignatures = mockSignatures.filter((sig) => sig.modelId === "current-model-id");

    useEffect(() => {
        if (selectedBaseSignature) {
            const baseSignature = modelSignatures.find((sig) => sig.id === selectedBaseSignature)
            if (baseSignature) {
                setJsonContent(JSON.stringify(baseSignature.schema, null, 2))
                // Auto-increment version
                const versionParts = baseSignature.version.split(".")
                const newMinorVersion = Number.parseInt(versionParts[1] || "0") + 1
                setVersion(`${versionParts[0]}.${newMinorVersion}.0`)
                setSignatureName(`${baseSignature.name} v${versionParts[0]}.${newMinorVersion}`)
            }
        } else {
            setJsonContent(JSON.stringify({
                "inputs": [], "outputs": []
            }))
            setVersion("1.0.0")
            setSignatureName("")
        }
    }, [selectedBaseSignature, modelSignatures])

    const isFormValid = isValid && signatureName.trim() && version.trim()

    return (
        <div className="flex flex-1 size-full overflow-hidden bg-gradient-to-br from-slate-50 via-green-50 to-emerald-50 dark:from-gray-900 dark:via-slate-800 dark:to-emerald-500">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="flex flex-row flex-1 overflow-hidden m-12 p-12 bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-md shadow-2xl border border-white/20 dark:border-gray-700/20"
            >
                <div className="flex flex-col flex-1">
                    {/* Header */}
                    <div className="flex flex-col p-6">
                        <motion.div
                            className="flex-start justify-self-start flex flex-col gap-4">
                            <motion.button
                                onClick={() => navigate("/models")}
                                className="self-start inline-flex items-center gap-2 text-sm font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer"
                            >
                                <ArrowLeft size={18} />
                                Back
                            </motion.button>

                            {/* Title */}
                            <motion.h1
                                className="text-5xl font-bold bg-gradient-to-r from-gray-900 to-emerald-600 dark:from-white dark:to-emerald-400 bg-clip-text text-transparent"
                            >
                                {CREATE_SIGNATURE_HEADER}
                            </motion.h1>

                            {/* Subtitle */}
                            <motion.p className="text-slate-400">
                                {CREATE_SIGNATURE_SUBHEADER}
                            </motion.p>
                        </motion.div>
                    </div>
                    <div className="flex-1 flex flex-row">
                        {/* Content */}
                        <div className="flex-1 flex overflow-hidden">
                            <div className="flex flex-1 flex-col p-6 gap-8">
                                {/* Timeline */}
                                <motion.ul
                                    variants={container}
                                    initial="hidden"
                                    animate="show"
                                    className="justify-self-start relative space-y-7"
                                >
                                    {/* Vertical line */}
                                    <span className="absolute left-5 top-0 bottom-0 w-px bg-slate-700/40" />
                                    {steps.map(({ icon: Icon, label }, idx) => (
                                        <motion.li key={idx} variants={item} className="flex items-center gap-3">
                                            <span className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full bg-slate-800/60 backdrop-blur ring-1 ring-inset ring-slate-700 shadow-inner">
                                                <Icon size={18} />
                                            </span>
                                            <span className="text-sm text-slate-300 md:text-base">{label}</span>
                                        </motion.li>
                                    ))}
                                </motion.ul>
                                <motion.div
                                    variants={item}
                                    className="justify-self-end max-w-fit p-4 rounded-2xl bg-slate-800/50 backdrop-blur-sm ring-1 ring-inset ring-slate-700 shadow-md"
                                >
                                    <h2 className="text-slate-200 font-semibold mb-2 text-sm">
                                        Upload best practices
                                    </h2>
                                    <ul className="list-disc list-inside text-xs text-slate-400 space-y-1">
                                        <li>Ensure the json follows the schema.</li>
                                    </ul>
                                </motion.div>
                            </div>
                            {/* Left Panel - Configuration */}
                            <div className="w-80 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border-r border-gray-200/50 dark:border-gray-700/50 p-6 overflow-y-auto">
                                <div className="space-y-6">
                                    {/* Base Signature Selection */}
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                                            Versión Base (Opcional)
                                        </label>
                                        <select
                                            value={selectedBaseSignature}
                                            onChange={(e) => setSelectedBaseSignature(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                        >
                                            <option value="">Crear desde cero</option>
                                            {modelSignatures.map((signature) => (
                                                <option key={signature.id} value={signature.id}>
                                                    {signature.name} (v{signature.version})
                                                </option>
                                            ))}
                                        </select>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                                            Selecciona una signature existente como base para la nueva versión
                                        </p>
                                    </div>

                                    {/* Signature Name */}
                                    <div>
                                        <label
                                            htmlFor="signature-name"
                                            className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3"
                                        >
                                            Nombre de la Signature
                                        </label>
                                        <input
                                            id="signature-name"
                                            type="text"
                                            value={signatureName}
                                            onChange={(e) => setSignatureName(e.target.value)}
                                            placeholder="Ej: Customer Churn v2.0"
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                        />
                                    </div>

                                    {/* Version */}
                                    <div>
                                        <label htmlFor="version" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                                            Versión
                                        </label>
                                        <input
                                            id="version"
                                            type="text"
                                            value={version}
                                            onChange={(e) => setVersion(e.target.value)}
                                            placeholder="1.0.0"
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                        />
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Formato semver: MAJOR.MINOR.PATCH</p>
                                    </div>
                                </div>
                                <motion.button
                                    onClick={() => { }}
                                    disabled={!isFormValid}
                                    className={`flex items-center space-x-2 px-6 py-3 font-medium rounded-xl transition-all duration-300 ${isFormValid
                                        ? "bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl"
                                        : "bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                                        }`}
                                    whileHover={isFormValid ? { scale: 1.02 } : {}}
                                    whileTap={isFormValid ? { scale: 0.98 } : {}}
                                >
                                    <Save size={18} />
                                    <span>Guardar Signature</span>
                                </motion.button>
                            </div>
                        </div>
                    </div>
                </div>
                {/* Right Panel - JSON Editor */}
                <EditorWrapper />
            </motion.div >
        </div >
    )
}
