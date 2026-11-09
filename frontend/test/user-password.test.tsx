/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

// @vitest-environment jsdom

import { beforeEach, describe, expect, test } from "vite-plus/test";
import { buttonByText, changeValue, click } from "./support/dom";
import {
  field,
  json,
  ownPage,
  requests,
  routes,
  serveProfileApi,
  settled,
} from "./support/user-profile-fixture";

beforeEach(serveProfileApi);

describe("changing one's password", () => {
  test("a password change needs both new entries to match and clears on success", async () => {
    routes.set("/api/users/me/password", () => new Response(null, { status: 204 }));
    const { host } = await ownPage("/profile?view=edit");
    await changeValue(field("Current password", host), "the-current-one");
    await changeValue(field("New password", host), "a-brand-new-one");
    await changeValue(field("Repeat new password", host), "something-else");

    expect(host.textContent).toContain("do not match");
    expect(buttonByText("Change password", host)?.hasAttribute("disabled")).toBe(true);

    await changeValue(field("Repeat new password", host), "a-brand-new-one");
    await click("Change password", host);
    await settled();

    expect(requests("POST")).toContainEqual({
      path: "/api/users/me/password",
      body: { currentPassword: "the-current-one", newPassword: "a-brand-new-one" },
    });
    expect(host.textContent).toContain("Password changed.");
    expect(field("Current password", host).value).toBe("");
  });

  test("a wrong current password keeps what was typed and says why", async () => {
    routes.set("/api/users/me/password", () =>
      json({ status: 400, message: "That is not your current password." }, 400),
    );
    const { host } = await ownPage("/profile?view=edit");
    await changeValue(field("Current password", host), "a-wrong-one-here");
    await changeValue(field("New password", host), "a-brand-new-one");
    await changeValue(field("Repeat new password", host), "a-brand-new-one");

    await click("Change password", host);
    await settled();

    expect(host.textContent).toContain("That is not your current password.");
    expect(field("Current password", host).value).toBe("a-wrong-one-here");
  });
});
