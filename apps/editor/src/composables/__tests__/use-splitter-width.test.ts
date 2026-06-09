import "fake-indexeddb/auto";
import { closeDb, loadSplitterWidth } from "@wechat-flow/core";
import { afterEach, describe, expect, it } from "vitest";
import { useSplitterWidth } from "../use-splitter-width";

afterEach(async () => {
  await closeDb();
  indexedDB.deleteDatabase("wechat-flow-db");
});

describe("useSplitterWidth — clamp + persist", () => {
  it("初始宽度等于 defaultWidth", () => {
    const { width } = useSplitterWidth("panel-a", 200, 160, 320);
    expect(width.value).toBe(200);
  });

  it("onResize 在范围内正常更新", async () => {
    const { width, onResize } = useSplitterWidth("panel-b", 200, 160, 320);
    await onResize(250);
    expect(width.value).toBe(250);
  });

  it("onResize 超过 maxWidth 被 clamp 到 maxWidth", async () => {
    const { width, onResize } = useSplitterWidth("panel-c", 200, 160, 320);
    await onResize(999);
    expect(width.value).toBe(320);
  });

  it("onResize 低于 minWidth 被 clamp 到 minWidth", async () => {
    const { width, onResize } = useSplitterWidth("panel-d", 200, 160, 320);
    await onResize(10);
    expect(width.value).toBe(160);
  });

  it("onResize 持久化写入 IndexedDB", async () => {
    const { onResize } = useSplitterWidth("panel-e", 200, 160, 320);
    await onResize(280);
    const saved = await loadSplitterWidth("panel-e");
    expect(saved).toBe(280);
  });

  it("init 从 IndexedDB 读回已保存宽度", async () => {
    const { onResize } = useSplitterWidth("panel-f", 200, 160, 320);
    await onResize(240);

    const { width: width2, init } = useSplitterWidth("panel-f", 200, 160, 320);
    await init();
    expect(width2.value).toBe(240);
  });

  it("init 对不存在的 key 保持 defaultWidth", async () => {
    const { width, init } = useSplitterWidth("panel-g", 200, 160, 320);
    await init();
    expect(width.value).toBe(200);
  });
});
