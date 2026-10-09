import { useState } from "react";
import { AppCombobox } from "@/shared/ui/AppCombobox";
import { catalogRemoteProps } from "@/shared/ui/catalog/catalogRemoteProps";
import { useSelectionCatalog } from "./review-creation-api";

/** Browse the server's facets of an explicit whole-result identity snapshot. */
export function ReviewSnapshotSelect({
  organizationId,
  ids,
  kind,
  value,
  label,
  disabled,
  onChange,
}: {
  organizationId: number | string;
  ids: string[];
  kind: "snapshots" | "bookmarks";
  value: string;
  label?: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  const [search, setSearch] = useState("");
  const query = useSelectionCatalog(organizationId, {
    ids: ids.map(Number),
    kind,
    search,
    size: 24,
  });
  // "All bookmarks" is a choice, not a search result: it leaves the list while searching.
  const all = kind === "bookmarks" && search === "" ? [{ id: "all", label: "All bookmarks" }] : [];
  return (
    <AppCombobox
      value={value || null}
      aria-label={kind === "snapshots" ? "Schema snapshot" : "Bookmark"}
      placeholder={kind === "snapshots" ? "Choose a snapshot" : "All bookmarks"}
      disabled={disabled}
      selectedItem={
        label
          ? { id: value, label }
          : kind === "bookmarks" && value === "all"
            ? { id: "all", label: "All bookmarks" }
            : undefined
      }
      items={[
        ...all,
        ...(query.data?.items ?? []).map((item) => ({ id: item.id, label: item.title })),
      ]}
      {...catalogRemoteProps(query, setSearch)}
      onChange={(item) => {
        if (item) onChange(item.id);
      }}
    />
  );
}
