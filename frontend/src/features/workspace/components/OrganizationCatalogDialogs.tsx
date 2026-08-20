import { Ellipsis, Pencil, Share2, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { AppIconButton } from "@/shared/ui/AppIconButton";
import { cx } from "@/shared/ui/cx";

export function OrganizationCardMenu({
  disabled,
  onDelete,
  onEditDescription,
  onEditName,
  onEditSlug,
  onTransferOwner,
}: {
  disabled: boolean;
  onDelete: () => void;
  onEditDescription: () => void;
  onEditName: () => void;
  onEditSlug: () => void;
  onTransferOwner: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener("pointerdown", close);
    return () => window.removeEventListener("pointerdown", close);
  }, []);
  const items = [
    { label: "Edit name", icon: Pencil, onClick: onEditName },
    { label: "Edit slug", icon: Pencil, onClick: onEditSlug },
    { label: "Edit description", icon: Pencil, onClick: onEditDescription },
    { label: "Transfer owner", icon: Share2, onClick: onTransferOwner },
    { label: "Delete", icon: Trash2, onClick: onDelete, danger: true },
  ];
  return (
    <div ref={ref} className="relative">
      <AppIconButton
        type="button"
        aria-label="Organization actions"
        disabled={disabled}
        className="size-8 rounded"
        onClick={() => setOpen((current) => !current)}
      >
        <Ellipsis size={16} />
      </AppIconButton>
      {open ? (
        <div className="absolute right-0 top-[calc(100%+0.5rem)] z-20 min-w-[190px] rounded border border-[var(--border-soft)] bg-[var(--surface-primary)] p-2 shadow-[var(--shadow-hover)]">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                type="button"
                className={cx(
                  "flex w-full items-center gap-3 rounded px-3 py-2.5 text-left text-sm font-medium hover:bg-[var(--surface-muted)]",
                  item.danger && "text-[var(--danger-text)] hover:bg-[var(--danger-quiet)]",
                )}
                onClick={() => {
                  item.onClick();
                  setOpen(false);
                }}
              >
                <Icon size={15} />
                {item.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
