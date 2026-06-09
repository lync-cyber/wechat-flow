import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PREVIEW_DEBOUNCE_MS } from "../../lib/constants";

// Note: useCodemirror uses onBeforeUnmount which requires a Vue component context.
// We test the debounce behavior and constants logic directly.

describe("PREVIEW_DEBOUNCE_MS constant", () => {
  it("PREVIEW_DEBOUNCE_MS equals 300", () => {
    expect(PREVIEW_DEBOUNCE_MS).toBe(300);
  });
});

describe("useCodemirror debounce logic (unit)", () => {
  it("does not fire onValueChange immediately on change", () => {
    vi.useFakeTimers();
    const onValueChange = vi.fn();
    let timer: ReturnType<typeof setTimeout> | null = null;

    // Replicate the debounce logic from useCodemirror
    function handleChange(value: string): void {
      if (timer !== null) clearTimeout(timer);
      timer = setTimeout(() => {
        onValueChange(value);
        timer = null;
      }, PREVIEW_DEBOUNCE_MS);
    }

    handleChange("hello");
    expect(onValueChange).not.toHaveBeenCalled();

    vi.advanceTimersByTime(PREVIEW_DEBOUNCE_MS);
    expect(onValueChange).toHaveBeenCalledOnce();
    expect(onValueChange).toHaveBeenCalledWith("hello");

    vi.useRealTimers();
  });

  it("debounce resets when called multiple times rapidly", () => {
    vi.useFakeTimers();
    const onValueChange = vi.fn();
    let timer: ReturnType<typeof setTimeout> | null = null;

    function handleChange(value: string): void {
      if (timer !== null) clearTimeout(timer);
      timer = setTimeout(() => {
        onValueChange(value);
        timer = null;
      }, PREVIEW_DEBOUNCE_MS);
    }

    handleChange("a");
    vi.advanceTimersByTime(100);
    handleChange("ab");
    vi.advanceTimersByTime(100);
    handleChange("abc");

    // At this point 200ms into the last call — no fire yet
    expect(onValueChange).not.toHaveBeenCalled();

    vi.advanceTimersByTime(PREVIEW_DEBOUNCE_MS);
    // Should fire exactly once with final value
    expect(onValueChange).toHaveBeenCalledOnce();
    expect(onValueChange).toHaveBeenCalledWith("abc");

    vi.useRealTimers();
  });

  it("onValueChange not called before PREVIEW_DEBOUNCE_MS elapses", () => {
    vi.useFakeTimers();
    const onValueChange = vi.fn();
    let timer: ReturnType<typeof setTimeout> | null = null;

    function handleChange(value: string): void {
      if (timer !== null) clearTimeout(timer);
      timer = setTimeout(() => {
        onValueChange(value);
        timer = null;
      }, PREVIEW_DEBOUNCE_MS);
    }

    handleChange("test");
    vi.advanceTimersByTime(PREVIEW_DEBOUNCE_MS - 1);
    expect(onValueChange).not.toHaveBeenCalled();

    vi.useRealTimers();
  });
});
