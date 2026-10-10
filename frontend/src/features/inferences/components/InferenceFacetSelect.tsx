import { useState } from "react";
import { useInferenceFacetCatalog } from "@/features/inferences/api/inference-catalog";
import { AppCombobox, type AppComboboxItem } from "@/shared/ui/AppCombobox";
import { catalogRemoteProps } from "@/shared/ui/catalog/catalogRemoteProps";

export function InferenceFacetSelect({
  kind,
  schemaId,
  bookmarkId,
  value,
  label,
  selectedLabel,
  staticOptions = [],
  onChange,
}: {
  kind: "schemas" | "bookmarks" | "columns";
  schemaId: string;
  bookmarkId: string;
  value: string;
  label: string;
  selectedLabel?: string;
  staticOptions?: AppComboboxItem<string>[];
  onChange: (value: string) => void;
}) {
  const [search, setSearch] = useState("");
  const query = useInferenceFacetCatalog(kind, schemaId, bookmarkId, search);
  const items = [
    ...(search ? [] : staticOptions),
    ...(query.data?.items ?? []).map((item) => ({ id: item.value, label: item.label })),
  ];
  return (
    <AppCombobox
      {...catalogRemoteProps(query, setSearch)}
      aria-label={label}
      placeholder={label}
      value={value || null}
      selectedItem={
        selectedLabel
          ? { id: value, label: selectedLabel }
          : staticOptions.find((item) => item.id === value)
      }
      items={items}
      onChange={(item) => {
        if (item) onChange(item.id);
      }}
    />
  );
}
