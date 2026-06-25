import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CommandDefinition } from "../command-registry.ts";
import { buildEditorCommands, filterCommands } from "../command-registry.ts";

const mockThemes = [
  { id: "default", name: "默认" },
  { id: "tech", name: "科技数码" },
  { id: "literary", name: "文学风" },
];

vi.mock("@wechat-flow/core/src/registry/theme.ts", () => ({
  listThemes: vi.fn(() => mockThemes),
}));

describe("command-registry: buildEditorCommands", () => {
  it("返回 CommandDefinition[] 且总数 ≥ 25", () => {
    const cmds = buildEditorCommands({ switchTheme: vi.fn() });
    expect(Array.isArray(cmds)).toBe(true);
    expect(cmds.length).toBeGreaterThanOrEqual(25);
  });

  it("每条命令包含 id / group / label 字段", () => {
    const cmds = buildEditorCommands({ switchTheme: vi.fn() });
    for (const cmd of cmds) {
      expect(typeof cmd.id).toBe("string");
      expect(cmd.id.length).toBeGreaterThan(0);
      expect(typeof cmd.group).toBe("string");
      expect(cmd.group.length).toBeGreaterThan(0);
      expect(typeof cmd.label).toBe("string");
      expect(cmd.label.length).toBeGreaterThan(0);
    }
  });

  it("包含 6 个分组：视图/主题/文档/内容/导出/帮助", () => {
    const cmds = buildEditorCommands({ switchTheme: vi.fn() });
    const groups = new Set(cmds.map((c) => c.group));
    expect(groups.has("视图")).toBe(true);
    expect(groups.has("主题")).toBe(true);
    expect(groups.has("文档")).toBe(true);
    expect(groups.has("内容")).toBe(true);
    expect(groups.has("导出")).toBe(true);
    expect(groups.has("帮助")).toBe(true);
  });

  it("主题分组命令由 listThemes() 动态生成，id 以 switch-theme- 前缀", () => {
    const cmds = buildEditorCommands({ switchTheme: vi.fn() });
    const themeGroup = cmds.filter((c) => c.group === "主题" && c.id.startsWith("switch-theme-"));
    expect(themeGroup.length).toBe(mockThemes.length);
    const ids = themeGroup.map((c) => c.id);
    expect(ids).toContain("switch-theme-default");
    expect(ids).toContain("switch-theme-tech");
  });

  it("主题命令的 run() 调用 switchTheme 回调并传入正确 themeId", () => {
    const switchTheme = vi.fn();
    const cmds = buildEditorCommands({ switchTheme });
    const techCmd = cmds.find((c) => c.id === "switch-theme-tech");
    if (!techCmd) throw new Error("switch-theme-tech not found");
    techCmd.run();
    expect(switchTheme).toHaveBeenCalledWith("tech");
  });

  it("每条命令都有 run 函数", () => {
    const cmds = buildEditorCommands({ switchTheme: vi.fn() });
    for (const cmd of cmds) {
      expect(typeof cmd.run).toBe("function");
    }
  });

  it("所有命令的 run() 执行均不抛异常", () => {
    const cmds = buildEditorCommands({ switchTheme: vi.fn() });
    for (const cmd of cmds) {
      expect(() => cmd.run(), `command ${cmd.id} run() should not throw`).not.toThrow();
    }
  });

  it("export-download-html.run() 调用 downloadHtml 回调", () => {
    const downloadHtml = vi.fn();
    const cmds = buildEditorCommands({ switchTheme: vi.fn(), downloadHtml });
    const cmd = cmds.find((c) => c.id === "export-download-html");
    if (!cmd) throw new Error("export-download-html not found");
    cmd.run();
    expect(downloadHtml).toHaveBeenCalledOnce();
  });

  it("空实现命令显式标记 placeholder: true，switch-theme 与 export-download-html 为真实实现无标记", () => {
    const cmds = buildEditorCommands({ switchTheme: vi.fn() });
    const realImplIds = new Set(["export-download-html"]);
    for (const cmd of cmds) {
      if (cmd.id.startsWith("switch-theme-") || realImplIds.has(cmd.id)) {
        expect(cmd.placeholder, `command ${cmd.id} has real run impl`).toBeUndefined();
      } else {
        expect(cmd.placeholder, `command ${cmd.id} is a stub and must declare placeholder`).toBe(
          true
        );
      }
    }
  });
});

describe("command-registry: filterCommands", () => {
  let cmds: CommandDefinition[];

  beforeEach(() => {
    cmds = buildEditorCommands({ switchTheme: vi.fn() });
  });

  it("空 query 返回全部命令", () => {
    const result = filterCommands(cmds, "");
    expect(result.length).toBe(cmds.length);
  });

  it("query='主题' 只返回含「主题」关键字的命令", () => {
    const result = filterCommands(cmds, "主题");
    expect(result.length).toBeGreaterThan(0);
    for (const item of result) {
      expect(item.label.includes("主题") || item.group.includes("主题")).toBe(true);
    }
  });

  it("query='tech' 匹配 switch-theme-tech 命令", () => {
    const result = filterCommands(cmds, "tech");
    const found = result.some((c) => c.id === "switch-theme-tech");
    expect(found).toBe(true);
  });

  it("query 大小写不敏感", () => {
    const lower = filterCommands(cmds, "tech");
    const upper = filterCommands(cmds, "TECH");
    expect(lower.length).toBe(upper.length);
    expect(lower.length).toBeGreaterThan(0);
  });

  it("无匹配时返回空数组", () => {
    const result = filterCommands(cmds, "xyznotexist__NONE__");
    expect(result).toHaveLength(0);
  });
});
