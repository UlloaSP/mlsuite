import { motion } from "framer-motion";
import { useAtom } from "jotai";
import { useCallback, useEffect, useRef, useState } from "react";

import { useParams } from "react-router";
import { initMLForm } from "../../app/utils/mlform";
import { schemaAtom } from "../../editor/atoms";
import { showModalAtom } from "../atoms";
import { CreatePredictionModal } from "./CreatePredictionModal";


export type CreatePredictionBodyFormProps = {}

export function CreatePredictionBodyForm({ }: CreatePredictionBodyFormProps) {
    const { modelId } = useParams<{ modelId: string }>()

    const [schema] = useAtom(schemaAtom);
    const [, setShowModal] = useAtom(showModalAtom);

    const containerRef = useRef<HTMLDivElement>(null);

    const mlform = initMLForm(modelId!);

    const [response, setResponse] = useState<Map<string, object>>(new Map());
    const [inputs, setInputs] = useState<Map<string, object>>(new Map());

    const handleSubmit = useCallback(
        async (inputs: Map<string, object>, response: Map<string, object>) => {
            setInputs(inputs);
            setResponse(response);
            setShowModal(true);
        },
        []                     // ← sin deps ⇒ referencia estable
    );

    useEffect(() => {
        if (containerRef.current) {
            mlform.toHTMLElement(schema, containerRef.current);
        }
    }, [schema]);

    useEffect(() => {
        const unsubscribe = mlform.onSubmit(handleSubmit);
        return unsubscribe;
    }, [mlform, handleSubmit]);

    return (
        <>
            <motion.div
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
                className="flex overflow-hidden size-full"
                ref={containerRef}
            />

            <CreatePredictionModal prediction={response} inputs={inputs} />
        </>
    )
}