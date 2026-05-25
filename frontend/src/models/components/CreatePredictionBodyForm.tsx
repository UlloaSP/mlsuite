import { useAtom } from "jotai";
import { m as motion } from "motion/react";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { useParams } from "react-router";
import { toast } from "sonner";
import { AppButton } from "../../app/components/ui-controls";
import { AppCopy, AppPanel } from "../../app/components/ui";
import { themeWithHtmlAtom } from "../../app/atoms";
import { mountPredictionForm } from "../../app/utils/mlform/mount";
import { schemaNeedsActivePluginCatalog } from "../../app/utils/mlform/schema-needs-plugin-catalog";
import { schemaAtom } from "../../editor/atoms";
import { showModalAtom } from "../atoms";
import {
  buildPersistedPredictionPayload,
  type PersistedExplanationState,
} from "../buildPersistedPredictionPayload";
import { loadPredictionCatalogDefinitions } from "../loadPredictionCatalogDefinitions";
import { isExplanationReportConfig } from "../report-contract";
import { CreatePredictionModal } from "./CreatePredictionModal";
import type { PredictionCatalogDefinitions } from "../loadPredictionCatalogDefinitions";

type CatalogLoadState =
  | {
      status: "loading";
      data: PredictionCatalogDefinitions;
      error: string | null;
    }
  | {
      status: "ready";
      data: PredictionCatalogDefinitions;
      error: string | null;
    }
  | {
      status: "error";
      data: PredictionCatalogDefinitions;
      error: string;
    };

const initialCatalogLoadState: CatalogLoadState = {
  status: "loading",
  data: {
    fieldDefinitions: [],
    reportDefinitions: [],
  },
  error: null,
};

type PredictionState = {
  response: Record<string, unknown>;
  inputs: Record<string, unknown>;
  explanationsPending: boolean;
};

type PredictionStateAction =
  | {
      type: "submitted";
      inputs: Record<string, unknown>;
      response: Record<string, unknown>;
      explanationsPending: boolean;
    }
  | { type: "response"; response: Record<string, unknown>; explanationsPending: boolean };

const predictionStateReducer = (
  state: PredictionState,
  action: PredictionStateAction,
): PredictionState => {
  switch (action.type) {
    case "submitted":
      return {
        inputs: action.inputs,
        response: action.response,
        explanationsPending: action.explanationsPending,
      };
    case "response":
      return {
        ...state,
        response: action.response,
        explanationsPending: action.explanationsPending,
      };
  }
};

const initialPredictionState: PredictionState = {
  response: {},
  inputs: {},
  explanationsPending: false,
};

const getPersistedExplanations = (
  form: NonNullable<ReturnType<typeof mountPredictionForm>>["form"],
): PersistedExplanationState[] =>
  form.reports.reduce<PersistedExplanationState[]>((items, explanation) => {
    if (!isExplanationReportConfig(explanation)) {
      return items;
    }
    const explanationState = form.state.reportStates[explanation.id] ?? explanation.state;
    const status = explanationState.status === "ready" ? "done" : explanationState.status;
    items.push({
      id: explanation.id,
      status,
      result: explanationState.payload,
      error: explanationState.error,
    });
    return items;
  }, []);

export function CreatePredictionBodyForm() {
  const { modelId } = useParams<{ modelId: string }>();

  const [schema] = useAtom(schemaAtom);
  const [showModal, setShowModal] = useAtom(showModalAtom);
  const [theme] = useAtom(themeWithHtmlAtom);

  const containerRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef<ReturnType<typeof mountPredictionForm> | null>(null);

  const [{ response, inputs, explanationsPending }, dispatchPredictionState] = useReducer(
    predictionStateReducer,
    initialPredictionState,
  );
  const [catalogState, setCatalogState] = useState<CatalogLoadState>(initialCatalogLoadState);
  const [mountError, setMountError] = useState<string | null>(null);
  const schemaNeedsPlugins = schemaNeedsActivePluginCatalog(schema);

  const handleSubmit = useCallback(
    (nextInputs: Record<string, unknown>, nextResponse: Record<string, unknown>) => {
      dispatchPredictionState({
        type: "submitted",
        inputs: nextInputs,
        response: nextResponse,
        explanationsPending: false,
      });
      setShowModal(true);
    },
    [setShowModal],
  );

  const loadCatalogDefinitions = useCallback(async () => {
    setCatalogState({
      status: "loading",
      data: initialCatalogLoadState.data,
      error: null,
    });

    try {
      setCatalogState({
        status: "ready",
        data: await loadPredictionCatalogDefinitions(),
        error: null,
      });
    } catch (error: unknown) {
      toast.error("Plugin catalog unavailable", {
        description: error instanceof Error ? error.message : String(error),
      });
      setCatalogState({
        status: "error",
        data: initialCatalogLoadState.data,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }, []);

  useEffect(() => {
    if (!schemaNeedsPlugins) {
      setCatalogState({
        status: "ready",
        data: initialCatalogLoadState.data,
        error: null,
      });
      return;
    }

    void loadCatalogDefinitions();
  }, [loadCatalogDefinitions, schemaNeedsPlugins]);

  useEffect(() => {
    if (
      !containerRef.current ||
      !schema ||
      !modelId ||
      (schemaNeedsPlugins && catalogState.status !== "ready")
    ) {
      return;
    }
    setMountError(null);
    try {
      const mounted = mountPredictionForm({
        container: containerRef.current,
        schema,
        modelId,
        theme,
        customFieldDefinitions: catalogState.data.fieldDefinitions,
        customReportDefinitions: catalogState.data.reportDefinitions,
        onSubmit: handleSubmit,
        onSubmitError(error) {
          toast.error("Prediction request failed", {
            description: error instanceof Error ? error.message : String(error),
          });
        },
      });
      mountedRef.current = mounted;
      const unsubscribe = mounted.form.subscribe((state) => {
        if (!state.lastResult) {
          return;
        }

        dispatchPredictionState({
          type: "response",
          response: buildPersistedPredictionPayload(
            state.lastResult.raw,
            getPersistedExplanations(mounted.form),
          ),
          explanationsPending: mounted.form.reports.some((explanation) => {
            if (!isExplanationReportConfig(explanation)) {
              return false;
            }
            const explanationState = state.reportStates[explanation.id] ?? explanation.state;
            return explanationState.status === "idle" || explanationState.status === "loading";
          }),
        });
      });

      return () => {
        unsubscribe();
        mountedRef.current = null;
        mounted.unmount();
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      toast.error("Schema incompatible", {
        description: message,
      });
      setMountError(message);
      return;
    }
  }, [catalogState, handleSubmit, modelId, schema, schemaNeedsPlugins, theme]);

  useEffect(() => {
    mountedRef.current?.updateTheme(theme);
  }, [theme]);

  return (
    <>
      {mountError ? (
        <div className="px-4 pb-4">
          <AppPanel className="space-y-4">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">
              Schema incompatible
            </h2>
            <AppCopy>{mountError}</AppCopy>
          </AppPanel>
        </div>
      ) : !schemaNeedsPlugins || catalogState.status === "ready" ? (
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
          className="flex size-full overflow-auto px-4 pb-4"
          ref={containerRef}
        />
      ) : (
        <div className="px-4 pb-4">
          <AppPanel className="space-y-4">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">
              {catalogState.status === "loading"
                ? "Loading explanation catalog"
                : "Explanation catalog unavailable"}
            </h2>
            <AppCopy>
              {catalogState.status === "loading"
                ? "Prediction form waits for MLForm plugin definitions before mount so custom field and report kinds validate and render correctly."
                : catalogState.error}
            </AppCopy>
            {catalogState.status === "loading" ? (
              <div className="h-20 animate-pulse rounded-[20px] bg-[var(--surface-muted)]" />
            ) : (
              <AppButton type="button" onClick={() => void loadCatalogDefinitions()}>
                Retry
              </AppButton>
            )}
          </AppPanel>
        </div>
      )}
      {showModal ? (
        <CreatePredictionModal
          prediction={response}
          inputs={inputs}
          signatureSchema={schema}
          explanationsPending={explanationsPending}
          theme={theme}
        />
      ) : null}
    </>
  );
}
