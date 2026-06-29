import { type MockInstance, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ComposeCopyInput } from "../copy.ts";
import * as copyMod from "../copy.ts";
import { mobileCopy } from "../mobile-copy.ts";

describe("mobileCopy: clipboard 可用分支", () => {
  let composeCopySpy: MockInstance<(input: ComposeCopyInput) => Promise<void>>;
  let origClipboardDescriptor: PropertyDescriptor | undefined;

  beforeEach(() => {
    origClipboardDescriptor = Object.getOwnPropertyDescriptor(navigator, "clipboard");
    Object.defineProperty(navigator, "clipboard", {
      value: { write: vi.fn() },
      configurable: true,
      writable: true,
    });
    composeCopySpy = vi
      .spyOn(copyMod, "composeCopy")
      .mockImplementation(async (input: ComposeCopyInput) => {
        input.notify?.({ type: "success", message: "已复制到剪贴板" });
      });
  });

  afterEach(() => {
    if (origClipboardDescriptor) {
      Object.defineProperty(navigator, "clipboard", origClipboardDescriptor);
    } else {
      Object.defineProperty(navigator, "clipboard", {
        value: undefined,
        configurable: true,
        writable: true,
      });
    }
    vi.restoreAllMocks();
  });

  it("调用 composeCopy 并通过 notify 转发 success 通知，notifySpy 恰好调用 1 次", async () => {
    const notifySpy = vi.fn();

    await mobileCopy({ markdown: "# Hello", notify: notifySpy });

    expect(composeCopySpy).toHaveBeenCalledOnce();
    expect(notifySpy).toHaveBeenCalledTimes(1);
    expect(notifySpy).toHaveBeenCalledWith(expect.objectContaining({ type: "success" }));
  });
});

describe("mobileCopy: clipboard 不可用分支", () => {
  let composeCopySpy: MockInstance<(input: ComposeCopyInput) => Promise<void>>;
  let origClipboardDescriptor: PropertyDescriptor | undefined;

  beforeEach(() => {
    origClipboardDescriptor = Object.getOwnPropertyDescriptor(navigator, "clipboard");
    Object.defineProperty(navigator, "clipboard", {
      value: undefined,
      configurable: true,
      writable: true,
    });
    composeCopySpy = vi
      .spyOn(copyMod, "composeCopy")
      .mockImplementation(async (input: ComposeCopyInput) => {
        input.notify?.({ type: "success", message: "已复制到剪贴板" });
      });

    // happy-dom may not have execCommand; inject a stub if absent
    if (typeof document.execCommand !== "function") {
      Object.defineProperty(document, "execCommand", {
        value: vi.fn().mockReturnValue(true),
        configurable: true,
        writable: true,
      });
    } else {
      vi.spyOn(document, "execCommand").mockReturnValue(true);
    }
  });

  afterEach(() => {
    if (origClipboardDescriptor) {
      Object.defineProperty(navigator, "clipboard", origClipboardDescriptor);
    } else {
      Object.defineProperty(navigator, "clipboard", {
        value: undefined,
        configurable: true,
        writable: true,
      });
    }
    vi.restoreAllMocks();
  });

  it("走 fallback 路径：composeCopy 未调用，notifySpy 以 type=warning 且含「请手动长按复制」调用", async () => {
    const notifySpy = vi.fn();

    await mobileCopy({ markdown: "# Hello", notify: notifySpy });

    expect(composeCopySpy).not.toHaveBeenCalled();
    expect(notifySpy).toHaveBeenCalledTimes(1);
    expect(notifySpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "warning",
        message: expect.stringContaining("请手动长按复制"),
      })
    );
  });
});
