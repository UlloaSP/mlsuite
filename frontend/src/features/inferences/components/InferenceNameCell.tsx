import { getPredictionShortId } from "@/capabilities/prediction-runtime/data/model-utils";
import { cx } from "@/shared/ui/cx";
import { FOCUS_RING } from "@/shared/ui/focus-ring";

/**
 * The row's keyboard target: clicking anywhere on the row opens the preview, and this
 * button gives the same action a focus stop.
 */
export function InferenceNameCell({
  id,
  name,
  onOpen,
}: {
  id: number;
  name: string;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onOpen();
      }}
      className={cx(
        "flex min-w-0 items-baseline gap-2 rounded-control text-left hover:underline",
        FOCUS_RING,
      )}
    >
      <span className="truncate font-medium text-fg">{name}</span>
      <span className="shrink-0 font-mono text-2xs text-fg-muted">
        #{getPredictionShortId(String(id))}
      </span>
    </button>
  );
}
