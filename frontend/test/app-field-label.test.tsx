// @vitest-environment jsdom
import { describe, expect, test, vi } from "vite-plus/test";
import { AppCombobox } from "@/shared/ui/AppCombobox";
import { AppFieldLabel } from "@/shared/ui/AppFieldLabel";
import { AppTextArea } from "@/shared/ui/AppTextArea";
import { AppTextField } from "@/shared/ui/AppTextField";
import { mount } from "./support/dom";

const labelsOf = (control: HTMLInputElement | HTMLTextAreaElement) =>
  [...(control.labels ?? [])].map((label) => label.textContent);

describe("field labels", () => {
  test("each control has exactly its field's label, which is its accessible name", async () => {
    const { host } = await mount(
      <>
        <AppFieldLabel label="Email">
          <AppTextField type="email" />
        </AppFieldLabel>
        <AppFieldLabel label="Description">
          <AppTextArea />
        </AppFieldLabel>
        <AppFieldLabel label="Owner">
          <AppCombobox items={[]} value={null} placeholder="Search owner" onChange={vi.fn()} />
        </AppFieldLabel>
      </>,
    );
    const [email, owner] = host.querySelectorAll("input");

    expect(labelsOf(email!)).toEqual(["Email"]);
    expect(labelsOf(host.querySelector("textarea")!)).toEqual(["Description"]);
    expect(labelsOf(owner!)).toEqual(["Owner"]);
    // An aria-label would replace the visible label as the name.
    expect(owner!.hasAttribute("aria-label")).toBe(false);
  });

  test("a control outside a field label keeps its own name and no label", async () => {
    const { host } = await mount(
      <>
        <AppTextField aria-label="Search" />
        <AppCombobox items={[]} value={null} placeholder="Search user" onChange={vi.fn()} />
      </>,
    );
    const [search, user] = host.querySelectorAll("input");

    expect(labelsOf(search!)).toEqual([]);
    expect(user!.getAttribute("aria-label")).toBe("Search user");
  });
});
