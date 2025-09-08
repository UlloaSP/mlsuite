import { useAtom } from "jotai"
import { Save } from "lucide-react"
import { motion } from "motion/react"
import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router"
import { schemaAtom, schemaErrorsAtom, schemaTextAtom } from "../../editor/atoms"
import { useCreateSignatureMutation, useGetSignatures } from "../hooks"


function compareSemverDesc(
    major: number, minor: number, patch: number,
    major1: number, minor1: number, patch1: number
): number {
    if (major !== major1) return major1 - major;
    if (minor !== minor1) return minor1 - minor;
    return patch1 - patch;
}

export type CreateSignatureActionSectionProps = {}

export function CreateSignatureActionSection({ }: CreateSignatureActionSectionProps) {
    const { modelId } = useParams<{ modelId: string }>()
    const navigate = useNavigate();

    const { data: signatures = [] } = useGetSignatures({ modelId: modelId! })
    const mutation = useCreateSignatureMutation()

    const [, setSchemaText] = useAtom(schemaTextAtom);
    const [schema, setSchema] = useAtom(schemaAtom);
    const [schemaErrors,] = useAtom(schemaErrorsAtom)

    const [signatureName, setSignatureName] = useState("")
    const [version, setVersion] = useState("")
    const [signatureId, setSignatureId] = useState<string>("");

    const isFormValid = schemaErrors <= 0 && signatureName && version && signatureId;

    const handleSaveSignature = async () => {
        const [major, minor, patch] = version.split('.').map(Number);
        await mutation.mutateAsync({ modelId: modelId!, name: signatureName, inputSignature: schema, major: major, minor: minor, patch: patch, origin: signatureId });
        navigate("/models");
    }

    useEffect(() => {
        if (!signatures.length) return;
        const [latest] = [...signatures].sort((a, b) => compareSemverDesc(a.major, a.minor, a.patch, b.major, b.minor, b.patch));
        setSignatureId(latest.id.toString());     // ← conversión aquí
    }, [signatures]);

    useEffect(() => {
        if (!signatureId) return;
        const sig = signatures.find(s => s.id.toString() === signatureId);
        if (!sig) return;
        setSchema(sig.inputSignature);
        setSchemaText(JSON.stringify(sig.inputSignature, null, 2));
        setVersion("");
        setSignatureName("");
    }, [signatureId, signatures]);

    return (

        <motion.div className="flex flex-col flex-1 justify-between px-6">
            <motion.div className="flex flex-col gap-6">
                {/* Base Signature Selection */}
                <motion.div>
                    <motion.label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                        Versión Base (Opcional)
                    </motion.label>
                    <motion.select
                        value={signatureId}
                        onChange={(e) => setSignatureId(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    >
                        {signatures.map((signature) => (
                            <motion.option key={signature.id} value={signature.id}>
                                {signature.name} (v{signature.major}.{signature.minor}.{signature.patch})
                            </motion.option>
                        ))}
                    </motion.select>
                    <motion.p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        Selecciona una signature existente como base para la nueva versión
                    </motion.p>
                </motion.div>

                {/* Signature Name */}
                <motion.div>
                    <motion.label
                        htmlFor="signature-name"
                        className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3"
                    >
                        Nombre de la Signature
                    </motion.label>
                    <motion.input
                        id="signature-name"
                        type="text"
                        value={signatureName}
                        onChange={(e) => setSignatureName(e.target.value)}
                        placeholder="Ej: Customer Churn v2.0"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                </motion.div>

                {/* Version */}
                <motion.div>
                    <motion.label htmlFor="version" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                        Versión
                    </motion.label>
                    <motion.input
                        id="version"
                        type="text"
                        value={version}
                        onChange={(e) => setVersion(e.target.value)}
                        placeholder="1.0.0"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                    <motion.p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Formato semver: MAJOR.MINOR.PATCH</motion.p>
                </motion.div>
            </motion.div>
            <motion.button
                onClick={handleSaveSignature}
                disabled={!isFormValid}
                className={`flex flex-row w-full items-center justify-center space-x-2 px-6 py-3 font-medium rounded-xl transition-all duration-300 ${isFormValid
                    ? "bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl"
                    : "bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                    }`}
                whileHover={isFormValid ? { scale: 1.02 } : {}}
                whileTap={isFormValid ? { scale: 0.98 } : {}}
            >
                <Save size={18} />
                <motion.span>Save</motion.span>
            </motion.button>
        </motion.div>
    )
}