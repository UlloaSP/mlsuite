import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";

const currentOrganizationIdAtom = atomWithStorage<number | null>(
  "workspace/current-organization-id",
  null,
);

export const syncCurrentOrganizationAtom = atom(
  null,
  (_get, set, organizationId: number | null) => {
    set(currentOrganizationIdAtom, organizationId);
  },
);
