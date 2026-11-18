import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useDismiss } from "./useDismiss";

// React registers its own document listeners (selectionchange); only the hook's two are counted.
const OURS = ["click", "keydown"];
const ours = (calls: unknown[][]) =>
  calls.filter(([type]) => OURS.includes(type as string));

function Popover({ open, onClose }: { open: boolean; onClose: () => void }) {
  const root = useDismiss<HTMLDivElement>(open, onClose);
  return (
    <div ref={root}>
      <button>inside</button>
    </div>
  );
}

afterEach(() => vi.restoreAllMocks());

describe("useDismiss", () => {
  it("leaves no document listener behind once closed or unmounted", () => {
    const add = vi.spyOn(document, "addEventListener");
    const remove = vi.spyOn(document, "removeEventListener");
    const close = vi.fn();
    const { rerender, unmount } = render(<Popover open onClose={close} />);
    expect(ours(add.mock.calls)).toHaveLength(2);
    const pairs = () => ours(add.mock.calls);

    rerender(<Popover open={false} onClose={close} />);
    expect(ours(remove.mock.calls)).toEqual(pairs());

    // Reopened, then unmounted while open.
    add.mockClear();
    remove.mockClear();
    rerender(<Popover open onClose={close} />);
    unmount();
    expect(ours(remove.mock.calls)).toEqual(pairs());

    fireEvent.click(document.body);
    fireEvent.keyDown(document.body, { key: "Escape" });
    expect(close).not.toHaveBeenCalled();
  });

  it("closes on a keyboard click (detail 0) without swallowing it", () => {
    const close = vi.fn();
    const under = vi.fn();
    render(
      <>
        <Popover open onClose={close} />
        <button onClick={under}>Under</button>
      </>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Under" }), {
      detail: 0,
    });
    expect(close).toHaveBeenCalledTimes(1);
    expect(under).toHaveBeenCalledTimes(1);
  });

  it("closes without swallowing when the popover is hidden, so the click still reaches its target", () => {
    // A breakpoint can hide an open popover (Menu open at 768px, then the window grows to 1024px).
    // A swallow nobody can see would just eat the next click.
    const close = vi.fn();
    const under = vi.fn();
    const { container } = render(
      <>
        <Popover open onClose={close} />
        <button onClick={under}>Under</button>
      </>,
    );
    Object.assign(container.firstChild as HTMLElement, {
      checkVisibility: () => false,
    });
    fireEvent.click(screen.getByRole("button", { name: "Under" }));
    expect(close).toHaveBeenCalledTimes(1);
    expect(under).toHaveBeenCalledTimes(1);
  });

  it("listens to nothing while closed", () => {
    const add = vi.spyOn(document, "addEventListener");
    render(<Popover open={false} onClose={vi.fn()} />);
    expect(ours(add.mock.calls)).toEqual([]);
  });
});
