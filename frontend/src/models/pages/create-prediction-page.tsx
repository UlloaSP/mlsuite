/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useAtom } from "jotai";
import { m as motion } from "motion/react";
import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router";
import { AppPage, AppSurface } from "../../app/components";
import { NotFoundError } from "../../app/pages/error-page";
import { applyPredictionInputsToSchema } from "../../app/utils/mlform/schema";
import { invalidatePluginCatalog } from "../../plugin/mlform/plugin-catalog";
import { schemaAtom, schemaErrorsAtom, schemaTextAtom } from "../../editor/atoms";
import { useUser } from "../../user/hooks";
import { CreatePredictionBodyForm } from "../components/CreatePredictionBodyForm";
import { CreatePredictionHeader } from "../components/CreatePredictionHeader";
import { PredictionSchemaPreview } from "../components/PredictionSchemaPreview";
import { useGetSignature } from "../hooks";

export function CreatePredictionPage() {
  const { signatureId } = useParams<{ signatureId: string }>();
  const { inputs } = useParams<{ inputs: string }>();
  const [searchParams] = useSearchParams();

  const [, setSchema] = useAtom(schemaAtom);
  const [, setSchemaText] = useAtom(schemaTextAtom);
  const [, setSchemaErrors] = useAtom(schemaErrorsAtom);

  const { data: signature } = useGetSignature({ signatureId: signatureId! });

  const [isEditorActive, setIsEditorActive] = useState(searchParams.get("view") !== "form");

  const { data: user, error } = useUser();

  useEffect(() => {
    invalidatePluginCatalog();
  }, []);

  // react-doctor-disable-next-line react-doctor/no-cascading-set-state -- Three independent Jotai atoms must mirror the loaded schema/editor contract together.
  useEffect(() => {
    if (!signature) return;

    setSchemaErrors([]);

    // Base schema from the fetched signature (not from state)
    const base: any = signature.inputSignature;

    // Optionally prefill from URL param
    let next = base;
    if (inputs) {
      try {
        const parsed = JSON.parse(decodeURIComponent(inputs)) as Record<string, unknown>;
        next = applyPredictionInputsToSchema(base, parsed);
      } catch (error) {
        console.error(error);
      }
    }

    setSchema(next);
    setSchemaText(JSON.stringify(next, null, 2));
  }, [inputs, setSchema, setSchemaErrors, setSchemaText, signature]);

  if (!user || error) return <NotFoundError />;

  return (
    <AppPage className="relative">
      <div className="absolute inset-0 flex flex-1 size-full overflow-hidden">
        <AppSurface className="flex flex-1 flex-col gap-4 overflow-hidden">
          <motion.div
            className="flex flex-1 flex-col gap-4 overflow-hidden"
            initial={false}
            animate={{
              opacity: 1,
              y: 0,
              padding: isEditorActive ? "1.5rem" : "0rem",
            }}
            transition={{ duration: 1, ease: "easeInOut" }}
          >
            <CreatePredictionHeader
              isEditorActive={isEditorActive}
              onToggleMode={() => setIsEditorActive(!isEditorActive)}
            />
            {isEditorActive ? <PredictionSchemaPreview /> : <CreatePredictionBodyForm />}
          </motion.div>
        </AppSurface>
      </div>
    </AppPage>
  );
}
