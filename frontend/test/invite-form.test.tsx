// @vitest-environment jsdom
import { act } from "react";
import { afterEach, expect, test, vi } from "vite-plus/test";
import { InviteForm } from "@/features/workspace/components/InviteForm";
import { mount, click } from "./support/dom";
import { unhandledRejections } from "./support/unhandled-rejections";

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

test("a refused invitation keeps the choice for a retry and raises nothing unhandled", async () => {
  vi.stubGlobal(
    "fetch",
    async (input: string) =>
      new Response(
        JSON.stringify({
          items: input.includes("roles/catalog")
            ? [{ id: 2, name: "Member", systemKey: "MEMBER" }]
            : [{ id: 3, fullName: "Future member", email: "new@example.com" }],
          page: 0,
          size: 24,
          totalItems: 1,
          hasNext: false,
        }),
        { headers: { "content-type": "application/json" } },
      ),
  );
  // The page's mutation has already told the member why.
  const onSubmit = vi.fn(async () => {
    throw new Error("This address already has a pending invitation.");
  });
  const { host } = await mount(<InviteForm organizationId={7} onSubmit={onSubmit} />);
  await settle();
  const user = host.querySelector<HTMLInputElement>('[aria-label="Search user"]')!;
  await act(async () => user.focus());
  await settle();
  const option = [...document.querySelectorAll<HTMLElement>('[role="option"]')].find((node) =>
    node.textContent?.includes("Future member"),
  )!;
  await act(async () => option.dispatchEvent(new MouseEvent("mousedown", { bubbles: true })));

  const unhandled = await unhandledRejections(async () => {
    await click("Send invite", host);
    await settle();
  });

  expect(onSubmit).toHaveBeenCalledWith({ email: "new@example.com", roleDefinitionId: 2 });
  expect(unhandled).toEqual([]);
  expect(user.value).toBe("Future member");
});

test("a superadmin adds the member at once, so the form says so", async () => {
  vi.stubGlobal(
    "fetch",
    async () =>
      new Response(
        JSON.stringify({
          items: [{ id: 2, name: "Member", systemKey: "MEMBER" }],
          page: 0,
          size: 24,
          totalItems: 1,
          hasNext: false,
        }),
        { headers: { "content-type": "application/json" } },
      ),
  );
  const { host } = await mount(
    <InviteForm organizationId={7} addsDirectly onSubmit={vi.fn(async () => {})} />,
  );
  await settle();

  expect(host.querySelector("button")?.textContent).toBe("Add member");
  expect(host.textContent).not.toContain("Send invite");
});
