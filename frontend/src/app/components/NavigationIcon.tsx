import { countLabel } from "./account-navigation";
import type { NavigationItem } from "./sidebar-navigation-support";

/** An entry's icon, with how many things in the section want attention. */
export function NavigationIcon({ item, size }: { item: NavigationItem; size: number }) {
  const Icon = item.icon;
  const icon = <Icon size={size} className="shrink-0" />;
  if (!item.attention) return icon;
  return (
    <span className="relative shrink-0">
      {icon}
      <span className="absolute -right-1.5 -top-1.5 grid min-w-3.5 place-items-center rounded-full bg-danger px-0.5 text-3xs font-bold leading-3.5 text-fg-inverse">
        <span aria-hidden>{countLabel(item.attention.count)}</span>
        <span className="sr-only">{item.attention.label}</span>
      </span>
    </span>
  );
}
