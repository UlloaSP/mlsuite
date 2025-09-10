import { atom } from "jotai";

export const schemaTextAtom = atom<string>("");
export const schemaAtom = atom<any>(null);
export const schemaErrorsAtom = atom<any>([]);
