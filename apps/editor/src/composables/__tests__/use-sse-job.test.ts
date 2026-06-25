import { describe, expect, it, vi } from "vitest";
import { useSseJob } from "../use-sse-job";

// Mock EventSource 工厂：返回可手动派发事件的假 EventSource
function makeMockEventSource() {
  const listeners: Record<string, ((e: MessageEvent) => void)[]> = {};
  const es = {
    addEventListener(event: string, cb: (e: MessageEvent) => void) {
      if (!listeners[event]) listeners[event] = [];
      listeners[event].push(cb);
    },
    close: vi.fn(),
    dispatch(event: string, data: unknown) {
      const msg = new MessageEvent(event, { data: JSON.stringify(data) });
      for (const cb of listeners[event] ?? []) cb(msg);
    },
  };
  return es;
}

describe("AC-001: SSE progress 事件 → status=running、percent 更新", () => {
  it("收到 progress 事件后 status 变为 running，percent 变为事件值", () => {
    const mockEs = makeMockEventSource();
    const factory = vi.fn().mockReturnValue(mockEs);
    const { status, percent, start } = useSseJob(factory as never);

    start("job-123");
    mockEs.dispatch("progress", { progress: 45 });

    expect(status.value).toBe("running");
    expect(percent.value).toBe(45);
  });

  it("初始 status 为 queued，percent 为 0", () => {
    const { status, percent } = useSseJob();
    expect(status.value).toBe("queued");
    expect(percent.value).toBe(0);
  });
});

describe("AC-002: SSE succeeded 事件 → status=completed、result 保存", () => {
  it("收到 succeeded 事件后 status 变为 completed，result 保存事件 result", () => {
    const mockEs = makeMockEventSource();
    const factory = vi.fn().mockReturnValue(mockEs);
    const { status, result, start } = useSseJob(factory as never);

    start("job-456");
    mockEs.dispatch("succeeded", { result: { downloadUrl: "https://cdn.example.com/img.png" } });

    expect(status.value).toBe("completed");
    expect((result.value as { downloadUrl: string }).downloadUrl).toBe(
      "https://cdn.example.com/img.png"
    );
  });

  it("succeeded 事件后 EventSource 被关闭", () => {
    const mockEs = makeMockEventSource();
    const factory = vi.fn().mockReturnValue(mockEs);
    const { start } = useSseJob(factory as never);

    start("job-456");
    mockEs.dispatch("succeeded", { result: {} });

    expect(mockEs.close).toHaveBeenCalled();
  });
});

describe("SSE failed 事件 → status=failed、error 保存", () => {
  it("收到 failed 事件后 status 变为 failed，error 保存事件 error", () => {
    const mockEs = makeMockEventSource();
    const factory = vi.fn().mockReturnValue(mockEs);
    const { status, error, start } = useSseJob(factory as never);

    start("job-789");
    mockEs.dispatch("failed", { error: { code: "E_TIMEOUT", message: "task timed out" } });

    expect(status.value).toBe("failed");
    expect(error.value?.code).toBe("E_TIMEOUT");
    expect(error.value?.message).toBe("task timed out");
  });
});

describe("stop() 关闭 EventSource", () => {
  it("stop 后 EventSource 被关闭", () => {
    const mockEs = makeMockEventSource();
    const factory = vi.fn().mockReturnValue(mockEs);
    const { start, stop } = useSseJob(factory as never);

    start("job-abc");
    stop();

    expect(mockEs.close).toHaveBeenCalled();
  });
});
