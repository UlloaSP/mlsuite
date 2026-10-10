// @vitest-environment jsdom
import { act, useState } from "react";
import { expect, test, vi } from "vite-plus/test";
import { AppCombobox } from "@/shared/ui/AppCombobox";
import { changeValue, mount, searchDelay } from "./support/dom";

const roles = [
  { id: 1, label: "Admin" },
  { id: 2, label: "Member" },
];
const settle = () => act(async () => new Promise((resolve) => setTimeout(resolve, 0)));
const input = (host: HTMLElement) => host.querySelector<HTMLInputElement>('[role="combobox"]')!;
const options = () =>
  [...document.querySelectorAll<HTMLElement>('[role="option"]')].map((node) => node.textContent);
const open = async (host: HTMLElement) => {
  await act(async () => input(host).focus());
  await settle();
};
const press = (host: HTMLElement, key: string) =>
  act(async () => {
    input(host).dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
  });

test("options open in the top layer, outside a container that would clip or cover them", async () => {
  const onChange = vi.fn();
  const { host } = await mount(
    <div style={{ overflow: "hidden", transform: "translateY(0)" }}>
      <AppCombobox value={null} items={roles} placeholder="Role" onChange={onChange} />
    </div>,
  );
  await open(host);

  const listbox = document.querySelector('[role="listbox"]')!;
  expect(host.contains(listbox)).toBe(false);
  expect(options()).toEqual(["Admin", "Member"]);

  await act(async () =>
    document
      .querySelectorAll('[role="option"]')[1]!
      .dispatchEvent(new MouseEvent("mousedown", { bubbles: true })),
  );
  expect(onChange).toHaveBeenCalledWith(roles[1]);
  expect(document.querySelector('[role="listbox"]')).toBeNull();
});

test("a local list filters as typed and Enter chooses the first match", async () => {
  const onChange = vi.fn();
  const { host } = await mount(
    <AppCombobox
      value={null}
      items={[{ id: 0, label: "All roles" }, ...roles]}
      placeholder="Role"
      onChange={onChange}
    />,
  );
  await open(host);
  await changeValue(input(host), "mem");
  await settle();

  expect(options()).toEqual(["Member"]);
  await press(host, "Enter");
  expect(onChange).toHaveBeenLastCalledWith(roles[1]);
});

test("a remote search waits for a pause in typing before asking the server", async () => {
  const onSearchChange = vi.fn();
  const { host } = await mount(
    <AppCombobox
      value={null}
      items={roles}
      placeholder="Role"
      onChange={vi.fn()}
      onSearchChange={onSearchChange}
    />,
  );
  await open(host);
  expect(onSearchChange.mock.calls).toEqual([[""]]);

  await changeValue(input(host), "a");
  await changeValue(input(host), "ad");
  expect(onSearchChange).toHaveBeenCalledTimes(1);
  await searchDelay();
  expect(onSearchChange.mock.calls).toEqual([[""], ["ad"]]);
});

test("a failed remote list is retried from the keyboard", async () => {
  const onRetry = vi.fn();
  function Failing() {
    const [error, setError] = useState(true);
    return (
      <AppCombobox
        value={null}
        items={error ? [] : roles}
        placeholder="Role"
        onChange={vi.fn()}
        onSearchChange={vi.fn()}
        error={error}
        onRetry={() => {
          onRetry();
          setError(false);
        }}
      />
    );
  }
  const { host } = await mount(<Failing />);
  await open(host);

  expect(options()).toEqual(["Could not load results. Retry"]);
  expect(input(host).getAttribute("aria-activedescendant")).toBe(
    document.querySelector('[role="option"]')!.id,
  );
  await press(host, "Enter");
  await settle();
  expect(onRetry).toHaveBeenCalledTimes(1);
  expect(options()).toEqual(["Admin", "Member"]);
});

test("clears a picked label when the parent resets the selected value", async () => {
  function Resettable() {
    const [value, setValue] = useState<number | null>(null);
    return (
      <>
        <AppCombobox
          value={value}
          items={roles}
          placeholder="Role"
          onChange={(item) => setValue(item?.id ?? null)}
        />
        <button onClick={() => setValue(null)}>Reset</button>
      </>
    );
  }
  const { host } = await mount(<Resettable />);
  await open(host);
  await press(host, "Enter");
  expect(input(host).value).toBe("Admin");
  await act(async () => host.querySelector("button")!.click());
  expect(input(host).value).toBe("");
});

test("appending remote options preserves pointer scrolling and keyboard navigation still scrolls", async () => {
  const entries = Array.from({ length: 90 }, (_, id) => ({ id, label: `Role ${id}` }));
  const props = { value: null, placeholder: "Role", onChange: vi.fn(), onSearchChange: vi.fn() };
  const view = await mount(<AppCombobox {...props} items={entries.slice(0, 70)} />);
  await open(view.host);
  const list = document.querySelector<HTMLElement>('[role="listbox"]')!;
  const scrollTo = vi.fn();
  list.scrollTo = scrollTo;
  await act(async () => {
    list.scrollTop = 900;
    list.dispatchEvent(new Event("scroll"));
  });
  await view.rerender(<AppCombobox {...props} items={entries.map((item) => ({ ...item }))} />);
  expect(list.scrollTop).toBe(900);
  expect(scrollTo).not.toHaveBeenCalled();
  await press(view.host, "ArrowDown");
  expect(scrollTo).toHaveBeenCalled();
});

test("only people carry a picture or an initial, and arrows start from the current choice", async () => {
  const { host } = await mount(
    <AppCombobox
      value={2}
      items={[
        { id: 1, label: "Ada", avatarUrl: null },
        { id: 2, label: "Member" },
      ]}
      placeholder="Role"
      onChange={vi.fn()}
      onSearchChange={vi.fn()}
    />,
  );
  await open(host);

  expect(options()).toEqual(["AAda", "Member"]);
  expect(input(host).getAttribute("aria-activedescendant")).toBe(
    document.querySelectorAll('[role="option"]')[1]!.id,
  );
});

test("the pointer and the keyboard share one highlighted option", async () => {
  const { host } = await mount(
    <AppCombobox
      value={1}
      items={roles}
      placeholder="Role"
      onChange={vi.fn()}
      onSearchChange={vi.fn()}
    />,
  );
  await open(host);
  const option = (index: number) =>
    document.querySelectorAll<HTMLElement>('[role="option"]')[index]!;
  const highlighted = () =>
    [...document.querySelectorAll('[role="option"]')].filter((node) =>
      node.className.split(" ").includes("bg-surface-muted"),
    );

  await act(async () => option(1).dispatchEvent(new MouseEvent("mousemove", { bubbles: true })));
  expect(highlighted()).toEqual([option(1)]);
  expect(input(host).getAttribute("aria-activedescendant")).toBe(option(1).id);
  // No separate hover colour remains to sit beside the active option.
  expect(option(0).className).not.toContain("hover:bg-surface-muted");
});
