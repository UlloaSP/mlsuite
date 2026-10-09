import { useState } from "react";
import { AppCombobox } from "@/shared/ui/AppCombobox";
import { catalogRemoteProps } from "@/shared/ui/catalog/catalogRemoteProps";
import { usePublicExampleCatalog } from "@/features/explore/api/public-catalog-api";
import type { PublicBookmarkExampleDto } from "@/shared/api/openapi.gen";
export function PublicBookmarkExampleSelect({
  publicId,
  value,
  onChange,
}: {
  publicId: string;
  value: PublicBookmarkExampleDto | undefined;
  onChange: (example: PublicBookmarkExampleDto | undefined) => void;
}) {
  const [search, setSearch] = useState("");
  const query = usePublicExampleCatalog(publicId, search);
  // Examples are optional: until they load, and when they cannot, the form stands on its own.
  if (!query.data || (query.data.totalItems === 0 && !search && !value)) return null;
  return (
    <div className="flex shrink-0 flex-col gap-x-3 gap-y-2 sm:flex-row sm:flex-wrap sm:items-center">
      <span className="text-sm font-semibold text-fg-secondary">Start from an example</span>
      <div className="w-full sm:w-72">
        <AppCombobox
          {...catalogRemoteProps(query, setSearch)}
          value={value?.id ?? null}
          selectedItem={value ? { id: value.id, label: value.name } : undefined}
          aria-label="Start from an example"
          placeholder="Choose an example"
          items={(query.data?.items ?? []).map((example) => ({
            id: example.id,
            label: example.name,
          }))}
          onChange={(item) => {
            if (item) onChange(query.data?.items.find((example) => example.id === item.id));
          }}
        />
      </div>
      <p className="text-xs text-fg-muted">
        Loading an example replaces what is in the form. You can edit every value afterwards.
      </p>
    </div>
  );
}
