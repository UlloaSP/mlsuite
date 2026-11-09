import { AppLink } from "@/shared/ui/AppLink";
import { getPredictionShortId } from "@/capabilities/prediction-runtime/data/model-utils";
import { middleEllipsis } from "@/shared/lib/middle-ellipsis";
import { AppCheckbox } from "@/shared/ui/AppCheckbox";
import { cx } from "@/shared/ui/cx";
import { FOCUS_RING } from "@/shared/ui/focus-ring";

/** What fits the name column beside the short id; longer names lose their middle, not their end. */
const NAME_CHARACTERS = 26;

type Props = {
  id: number;
  name: string;
  /** Present when the member may delete the row: its checkbox for the bulk delete. */
  selection?: { checked: boolean; onToggle: () => void };
};

/**
 * The row's keyboard target: clicking anywhere on the row opens the inference, and this
 * link gives the same destination a focus stop.
 */
export function InferenceNameCell({ id, name, selection }: Props) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      {selection ? (
        <AppCheckbox
          aria-label={`Select ${name}`}
          checked={selection.checked}
          onChange={selection.onToggle}
          onClick={(event) => event.stopPropagation()}
        />
      ) : null}
      <AppLink
        to="/inferences/$inferenceId"
        params={{ inferenceId: String(id) }}
        onClick={(event) => event.stopPropagation()}
        title={name}
        className={cx(
          "flex min-w-0 items-baseline gap-2 rounded-control text-left hover:underline",
          FOCUS_RING,
        )}
      >
        <span className="truncate font-medium text-fg">
          {middleEllipsis(name, NAME_CHARACTERS)}
        </span>
        <span className="shrink-0 font-mono text-2xs text-fg-muted">
          #{getPredictionShortId(String(id))}
        </span>
      </AppLink>
    </div>
  );
}
