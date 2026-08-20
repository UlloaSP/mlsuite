import { AppButton } from "@/shared/ui/AppButton";

type Props = {
  title: string;
  count: number;
  total: number;
  onClear: () => void;
};

export function ReviewSelectionHeader({ title, count, total, onClear }: Props) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <h3 className="font-semibold">{title}</h3>
        <p className="text-xs text-[var(--text-secondary)]">
          {count} of {total} selected
        </p>
      </div>
      {count ? (
        <AppButton type="button" variant="ghost" onClick={onClear}>
          Clear
        </AppButton>
      ) : null}
    </div>
  );
}
