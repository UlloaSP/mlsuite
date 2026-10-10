// @vitest-environment jsdom
import { act } from "react";
import { afterEach, expect, test, vi } from "vite-plus/test";
import { InviteForm } from "@/features/workspace/components/InviteForm";
import { mount, click } from "./support/dom";

afterEach(() => vi.unstubAllGlobals());
const settle = async () => {
  for (let i = 0; i < 6; i++)
    await act(async () => new Promise((resolve) => setTimeout(resolve, 0)));
};

test("an elevated invitation resets to Member and clears the candidate for the next invitation", async () => {
  vi.stubGlobal(
    "fetch",
    async (input: string) =>
      new Response(
        JSON.stringify({
          items: input.includes("roles/catalog")
            ? [
                { id: 1, name: "Admin", systemKey: "ADMIN" },
                { id: 2, name: "Member", systemKey: "MEMBER" },
              ]
            : [{ id: 3, fullName: "Future member", email: "new@example.com" }],
          page: 0,
          size: 24,
          totalItems: 2,
          hasNext: false,
        }),
        { headers: { "content-type": "application/json" } },
      ),
  );
  const onSubmit = vi.fn(async () => {});
  const { host } = await mount(<InviteForm organizationId={7} onSubmit={onSubmit} />);
  await settle();
  const field = (label: string) => host.querySelector<HTMLInputElement>(`[aria-label="${label}"]`)!;
  const choose = async (label: string, name: string) => {
    await act(async () => field(label).focus());
    await settle();
    const option = [...document.querySelectorAll<HTMLElement>('[role="option"]')].find((node) =>
      node.textContent?.includes(name),
    )!;
    await act(async () => option.dispatchEvent(new MouseEvent("mousedown", { bubbles: true })));
  };
  expect(field("Search role").value).toBe("Member");
  await choose("Search user", "Future member");
  await choose("Search role", "Admin");
  await click("Send invite", host);
  await settle();
  expect(onSubmit).toHaveBeenCalledWith({ email: "new@example.com", roleDefinitionId: 1 });
  expect(field("Search role").value).toBe("Member");
  expect(field("Search user").value).toBe("");
  expect((host.querySelector("button") as HTMLButtonElement).disabled).toBe(true);
  await choose("Search user", "Future member");
  await click("Send invite", host);
  expect(onSubmit).toHaveBeenLastCalledWith({ email: "new@example.com", roleDefinitionId: 2 });
});
