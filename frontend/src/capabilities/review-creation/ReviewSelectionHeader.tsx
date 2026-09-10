import { AppButton } from "@/shared/ui/AppButton";

type Props = {
  title: string;
  count: number;
  total: number;
  onClear: () => void;
  onSelectAll: () => void;
  selectLabel: string;
  selectDisabled: boolean;
};

export function ReviewSelectionHeader({
  title,
  count,
  total,
  onClear,
  onSelectAll,
  selectLabel,
  selectDisabled,
}: Props) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <h3 className="font-semibold">{title}</h3>
        <p className="text-xs text-[var(--text-secondary)]">
          {count} of {total} selected
        </p>
      </div>
      <div className="flex items-center gap-1">
        <AppButton type="button" variant="ghost" disabled={selectDisabled} onClick={onSelectAll}>
          {selectLabel}
        </AppButton>
        <AppButton type="button" variant="ghost" disabled={!count} onClick={onClear}>
          Clear
        </AppButton>
      </div>
    </div>
  );
}
