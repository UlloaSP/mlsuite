export type SearchShortcutEvent = {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
};

export const isGlobalSearchShortcut = (event: SearchShortcutEvent) =>
  event.key.toLowerCase() === "k" &&
  (event.ctrlKey === true || event.metaKey === true) &&
  event.altKey !== true &&
  event.shiftKey !== true;
