import { AppCheckMark } from "@/shared/ui/AppCheckMark";
type Props = {
  selected: boolean;
  title: string;
  detail: string;
  onClick: () => void;
};

export function ReviewSelectionRow({ selected, title, detail, onClick }: Props) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`grid w-full grid-cols-[auto_minmax(0,1fr)] items-center gap-3 border-b border-line px-4 py-3 text-left transition last:border-b-0 ${selected ? "bg-accent-subtle" : "hover:bg-surface-muted"}`}
    >
      <AppCheckMark checked={selected} />
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold">{title}</span>
        <span className="block truncate text-xs text-fg-secondary">{detail}</span>
      </span>
    </button>
  );
}
