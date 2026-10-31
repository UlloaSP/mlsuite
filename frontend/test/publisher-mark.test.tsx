// @vitest-environment jsdom
import { describe, expect, test } from "vite-plus/test";
import { PublisherMark } from "@/shared/ui/PublisherMark";
import { mount } from "./support/dom";

const open = (kind: "PERSONAL" | "TEAM", logoUrl: string | null = null) =>
  mount(
    <PublisherMark
      className="size-5 rounded-sm"
      iconSize={14}
      kind={kind}
      logoUrl={logoUrl}
      name="Ada Lovelace"
    />,
  );

describe("the mark beside a publisher's name", () => {
  test("a person is shown by their initials, not as a building", async () => {
    const { host } = await open("PERSONAL");

    expect(host.textContent).toBe("AD");
    expect(host.querySelector("svg")).toBeNull();
  });

  test("an organization keeps its building icon", async () => {
    const { host } = await open("TEAM");

    expect(host.textContent).toBe("");
    expect(host.querySelector("svg")).not.toBeNull();
  });

  test("an organization with a logo shows the logo", async () => {
    const { host } = await open("TEAM", "/api/public/organizations/3/logo?v=1");

    expect(host.querySelector("img")).not.toBeNull();
  });
});
