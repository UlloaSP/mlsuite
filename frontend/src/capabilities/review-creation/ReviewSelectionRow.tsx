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
      onClick={onClick}
      className={`grid w-full grid-cols-[auto_minmax(0,1fr)] items-center gap-3 border-b border-line px-4 py-3 text-left transition last:border-b-0 ${selected ? "bg-accent-subtle" : "hover:bg-surface-muted"}`}
    >
      <span
        className={`grid size-5 place-items-center rounded border text-xs font-semibold ${selected ? "border-accent bg-accent text-on-accent" : "border-line-strong text-transparent"}`}
      >
        ✓
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold">{title}</span>
        <span className="block truncate text-xs text-fg-secondary">{detail}</span>
      </span>
    </button>
  );
}
