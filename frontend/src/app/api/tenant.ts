const KEY = "mlsuite.activeOrganizationSlug";

export const getActiveOrganizationSlug = (): string | null => {
  const value = window.localStorage.getItem(KEY);
  return value && value.trim() ? value.trim() : null;
};

export const setActiveOrganizationSlug = (slug: string | null | undefined) => {
  if (!slug || !slug.trim()) {
    window.localStorage.removeItem(KEY);
    return;
  }
  window.localStorage.setItem(KEY, slug.trim());
};

export const clearActiveOrganizationSlug = () => {
  window.localStorage.removeItem(KEY);
};
