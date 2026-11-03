import { linkOptions } from "@tanstack/react-router";

/** The page of a person's profile, for a handle the API says may be linked to. */
export const profileLink = (handle: string) =>
  linkOptions({ to: "/u/$handle", params: { handle } });
