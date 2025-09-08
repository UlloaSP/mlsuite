import { ArrowLeft } from "lucide-react"
import { motion } from "motion/react"
import { useNavigate } from "react-router"

const CREATE_SIGNATURE_HEADER = "Create New Signature"
const CREATE_SIGNATURE_SUBHEADER = "Define the schema for your model's inputs"


export type CreateSignatureHeaderProps = {}

export function CreateSignatureHeader({ }: CreateSignatureHeaderProps) {
    const navigate = useNavigate()
    return (
        <motion.div className="flex-1 flex flex-col">
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
                    className="text-5xl leading-20 font-bold bg-gradient-to-r from-gray-900 to-emerald-600 dark:from-white dark:to-emerald-400 bg-clip-text text-transparent"
                >
                    {CREATE_SIGNATURE_HEADER}
                </motion.h1>

                {/* Subtitle */}
                <motion.p className="text-slate-400">
                    {CREATE_SIGNATURE_SUBHEADER}
                </motion.p>
            </motion.div>
        </motion.div>
    )
}