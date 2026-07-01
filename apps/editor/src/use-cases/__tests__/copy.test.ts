import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { composeCopy } from "../copy.ts";

function setViewportWidth(width: number): void {
  Object.defineProperty(window, "innerWidth", { value: width, configurable: true, writable: true });
}

describe("composeCopy: 桌面 execCommand 降级 (AC-001, AC-002)", () => {
  let origClipboardDescriptor: PropertyDescriptor | undefined;
  let origInnerWidthDescriptor: PropertyDescriptor | undefined;
  let origExecCommandDescriptor: PropertyDescriptor | undefined;

  beforeEach(() => {
    origInnerWidthDescriptor = Object.getOwnPropertyDescriptor(window, "innerWidth");
    setViewportWidth(1024);

    origClipboardDescriptor = Object.getOwnPropertyDescriptor(navigator, "clipboard");
    Object.defineProperty(navigator, "clipboard", {
      value: { write: vi.fn().mockRejectedValue(new Error("no clipboard")) },
      configurable: true,
      writable: true,
    });

    origExecCommandDescriptor = Object.getOwnPropertyDescriptor(document, "execCommand");
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
    if (origInnerWidthDescriptor) {
      Object.defineProperty(window, "innerWidth", origInnerWidthDescriptor);
    }
    if (origClipboardDescriptor) {
      Object.defineProperty(navigator, "clipboard", origClipboardDescriptor);
    } else {
      Object.defineProperty(navigator, "clipboard", {
        value: undefined,
        configurable: true,
        writable: true,
      });
    }
    if (origExecCommandDescriptor) {
      Object.defineProperty(document, "execCommand", origExecCommandDescriptor);
    }
    vi.restoreAllMocks();
  });

  it("AC-001: 自动创建隐藏 textarea、调用 execCommand('copy')、结束后移除 textarea，且不抛出未捕获异常", async () => {
    await expect(composeCopy({ markdown: "# Hi", notify: vi.fn() })).resolves.toBeUndefined();

    expect(document.execCommand).toHaveBeenCalledWith("copy");
    expect(document.querySelector("textarea")).toBeNull();
  });

  it("AC-002: execCommand 调用后经 notify 触发 warning 提示 Ctrl/Cmd+C 手动复制，区别于「复制失败」硬错", async () => {
    const notifySpy = vi.fn();

    await composeCopy({ markdown: "# Hi", notify: notifySpy });

    expect(notifySpy).toHaveBeenCalledTimes(1);
    expect(notifySpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "warning",
        message: expect.stringMatching(/Ctrl|Cmd/),
      })
    );
    const call = notifySpy.mock.calls[0][0];
    expect(call.message).not.toBe("复制失败");
  });
});

describe("composeCopy: 现代浏览器成功路径不回归 (AC-003)", () => {
  let origClipboardDescriptor: PropertyDescriptor | undefined;
  let origInnerWidthDescriptor: PropertyDescriptor | undefined;

  beforeEach(() => {
    origInnerWidthDescriptor = Object.getOwnPropertyDescriptor(window, "innerWidth");
    setViewportWidth(1024);

    origClipboardDescriptor = Object.getOwnPropertyDescriptor(navigator, "clipboard");
    Object.defineProperty(navigator, "clipboard", {
      value: { write: vi.fn().mockResolvedValue(undefined) },
      configurable: true,
      writable: true,
    });

    if (typeof document.execCommand === "function") {
      vi.spyOn(document, "execCommand").mockReturnValue(true);
    } else {
      Object.defineProperty(document, "execCommand", {
        value: vi.fn().mockReturnValue(true),
        configurable: true,
        writable: true,
      });
    }
  });

  afterEach(() => {
    if (origInnerWidthDescriptor) {
      Object.defineProperty(window, "innerWidth", origInnerWidthDescriptor);
    }
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

  it("AC-003: clipboard.write 成功时走原 dual-MIME 路径 + success Toast，不触发 execCommand 降级", async () => {
    const notifySpy = vi.fn();

    await composeCopy({ markdown: "# Hi", notify: notifySpy });

    expect(navigator.clipboard.write).toHaveBeenCalledOnce();
    expect(document.execCommand).not.toHaveBeenCalled();
    expect(notifySpy).toHaveBeenCalledWith(expect.objectContaining({ type: "success" }));
  });
});

describe("composeCopy: 移动端不触发桌面降级 (AC-004)", () => {
  let origClipboardDescriptor: PropertyDescriptor | undefined;
  let origInnerWidthDescriptor: PropertyDescriptor | undefined;
  let origExecCommandDescriptor: PropertyDescriptor | undefined;

  beforeEach(() => {
    origInnerWidthDescriptor = Object.getOwnPropertyDescriptor(window, "innerWidth");
    setViewportWidth(375);

    origClipboardDescriptor = Object.getOwnPropertyDescriptor(navigator, "clipboard");
    Object.defineProperty(navigator, "clipboard", {
      value: { write: vi.fn().mockRejectedValue(new Error("no clipboard")) },
      configurable: true,
      writable: true,
    });

    origExecCommandDescriptor = Object.getOwnPropertyDescriptor(document, "execCommand");
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
    if (origInnerWidthDescriptor) {
      Object.defineProperty(window, "innerWidth", origInnerWidthDescriptor);
    }
    if (origClipboardDescriptor) {
      Object.defineProperty(navigator, "clipboard", origClipboardDescriptor);
    } else {
      Object.defineProperty(navigator, "clipboard", {
        value: undefined,
        configurable: true,
        writable: true,
      });
    }
    if (origExecCommandDescriptor) {
      Object.defineProperty(document, "execCommand", origExecCommandDescriptor);
    }
    vi.restoreAllMocks();
  });

  it("AC-004: vw < 768 时不走桌面 execCommand 降级，走原 error Toast「复制失败」", async () => {
    const notifySpy = vi.fn();

    await composeCopy({ markdown: "# Hi", notify: notifySpy });

    expect(document.execCommand).not.toHaveBeenCalled();
    expect(notifySpy).toHaveBeenCalledWith(
      expect.objectContaining({ type: "error", message: "复制失败" })
    );
  });
});
