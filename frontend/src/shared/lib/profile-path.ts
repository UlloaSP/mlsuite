/** The page of a person's profile, for a handle the API says may be linked to. */
export const profilePath = (handle: string) => `/u/${encodeURIComponent(handle)}`;
