import { Search } from "lucide-react";
import { AppTextField } from "./AppTextField";

type AppSearchFieldProps = {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  /** Result count shown as "N noun" or, while filtered, "X of N noun". */
  count?: { shown: number; total: number; filtered: boolean; noun: string };
};

export function AppSearchField({
  label,
  placeholder,
  value,
  onChange,
  className = "w-full",
  count,
}: AppSearchFieldProps) {
  return (
    <AppTextField
      className={className}
      aria-label={label}
      placeholder={placeholder}
      prefix={<Search className="size-4 shrink-0 text-fg-muted" />}
      suffix={
        count ? (
          <span className="shrink-0 whitespace-nowrap border-l border-line pl-3 text-sm font-semibold text-fg-secondary">
            {count.filtered ? `${count.shown} of ${count.total}` : count.total} {count.noun}
          </span>
        ) : undefined
      }
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}
