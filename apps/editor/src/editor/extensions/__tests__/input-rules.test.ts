import { EditorState } from "@codemirror/state";
import { describe, expect, it } from "vitest";
import { type InputRuleMatch, inputRulesExtension, matchInputRule } from "../input-rules.ts";

describe("AC-001: matchInputRule — 中英自动空格（双向）", () => {
  it("before 为中文，inserted 为 ASCII 字母 → 插入前导空格", () => {
    const result: InputRuleMatch | null = matchInputRule("文", "a");
    expect(result).toEqual({ insert: " a", consumeBefore: 0 });
  });

  it("before 为中文，inserted 为 ASCII 数字 → 插入前导空格", () => {
    const result = matchInputRule("文", "1");
    expect(result).toEqual({ insert: " 1", consumeBefore: 0 });
  });

  it("before 为 ASCII 字母，inserted 为中文 → 插入前导空格", () => {
    const result = matchInputRule("c", "中");
    expect(result).toEqual({ insert: " 中", consumeBefore: 0 });
  });

  it("before 为 ASCII 数字，inserted 为中文 → 插入前导空格", () => {
    const result = matchInputRule("3", "文");
    expect(result).toEqual({ insert: " 文", consumeBefore: 0 });
  });

  it("before 已是空白 → 不命中空格规则（避免双空格）", () => {
    const result = matchInputRule(" ", "a");
    expect(result).toBeNull();
  });

  it("before 与 inserted 均为中文 → 不命中", () => {
    const result = matchInputRule("中", "文");
    expect(result).toBeNull();
  });

  it("before 与 inserted 均为 ASCII → 不命中", () => {
    const result = matchInputRule("a", "b");
    expect(result).toBeNull();
  });
});

describe("AC-002: matchInputRule — 双引号智能转换", () => {
  it('行首/文档首（before为空串）键入 " → 左双引号', () => {
    const result = matchInputRule("", '"');
    expect(result).toEqual({ insert: "“", consumeBefore: 0 });
  });

  it('空格后键入 " → 左双引号', () => {
    const result = matchInputRule(" ", '"');
    expect(result).toEqual({ insert: "“", consumeBefore: 0 });
  });

  it('换行后（before为\\n）键入 " → 左双引号', () => {
    const result = matchInputRule("\n", '"');
    expect(result).toEqual({ insert: "“", consumeBefore: 0 });
  });

  it('非空白字符后键入 " → 右双引号', () => {
    const result = matchInputRule("好", '"');
    expect(result).toEqual({ insert: "”", consumeBefore: 0 });
  });

  it('ASCII 字符后键入 " → 右双引号', () => {
    const result = matchInputRule("a", '"');
    expect(result).toEqual({ insert: "”", consumeBefore: 0 });
  });
});

describe("AC-003: matchInputRule — 单引号智能转换", () => {
  it("行首/文档首键入 ' → 左单引号", () => {
    const result = matchInputRule("", "'");
    expect(result).toEqual({ insert: "‘", consumeBefore: 0 });
  });

  it("空格后键入 ' → 左单引号", () => {
    const result = matchInputRule(" ", "'");
    expect(result).toEqual({ insert: "‘", consumeBefore: 0 });
  });

  it("非空白字符后键入 ' → 右单引号", () => {
    const result = matchInputRule("好", "'");
    expect(result).toEqual({ insert: "’", consumeBefore: 0 });
  });
});

describe("AC-006: matchInputRule — 破折号转换", () => {
  it("before 为 '-'，再键入 '-' → 替换为中文破折号 ——，consumeBefore=1", () => {
    const result = matchInputRule("-", "-");
    expect(result).toEqual({ insert: "——", consumeBefore: 1 });
  });

  it("before 不是 '-'，键入 '-' → 不命中", () => {
    const result = matchInputRule("a", "-");
    expect(result).toBeNull();
  });

  it("before 为空串，键入 '-' → 不命中", () => {
    const result = matchInputRule("", "-");
    expect(result).toBeNull();
  });
});

describe("matchInputRule — 无规则命中场景", () => {
  it("普通字母键入普通字母场景之外的任意不匹配组合返回 null", () => {
    expect(matchInputRule(".", ",")).toBeNull();
    expect(matchInputRule("!", "?")).toBeNull();
  });
});

describe("AC-005 + AC-001: inputRulesExtension — 中英混排逐字符键入集成", () => {
  it("逐字符键入 '中文abc' 后文档为 '中文 abc'", () => {
    let state = EditorState.create({
      doc: "",
      extensions: [inputRulesExtension()],
    });

    const chars = ["中", "文", "a", "b", "c"];
    for (const ch of chars) {
      const pos = state.doc.length;
      const tr = state.update({
        changes: { from: pos, to: pos, insert: ch },
        selection: { anchor: pos + ch.length },
        userEvent: "input.type",
      });
      state = tr.state;
    }

    expect(state.doc.toString()).toBe("中文 abc");
  });

  it("逐字符键入 'abc中' 后文档为 'abc 中'", () => {
    let state = EditorState.create({
      doc: "",
      extensions: [inputRulesExtension()],
    });

    const chars = ["a", "b", "c", "中"];
    for (const ch of chars) {
      const pos = state.doc.length;
      const tr = state.update({
        changes: { from: pos, to: pos, insert: ch },
        selection: { anchor: pos + ch.length },
        userEvent: "input.type",
      });
      state = tr.state;
    }

    expect(state.doc.toString()).toBe("abc 中");
  });
});

describe("AC-002 集成: inputRulesExtension — 行首键入双引号", () => {
  it('空文档键入 " 得到左双引号 “', () => {
    const state = EditorState.create({
      doc: "",
      extensions: [inputRulesExtension()],
    });
    const tr = state.update({
      changes: { from: 0, to: 0, insert: '"' },
      selection: { anchor: 1 },
      userEvent: "input.type",
    });
    expect(tr.state.doc.toString()).toBe("“");
  });

  it('非行首非空格后键入 " 得到右双引号 ”', () => {
    const state = EditorState.create({
      doc: "好",
      selection: { anchor: 1 },
      extensions: [inputRulesExtension()],
    });
    const tr = state.update({
      changes: { from: 1, to: 1, insert: '"' },
      selection: { anchor: 2 },
      userEvent: "input.type",
    });
    expect(tr.state.doc.toString()).toBe("好”");
  });
});

describe("AC-006 集成: inputRulesExtension — 连续键入 -- 得到破折号 ——", () => {
  it("先后键入两个 '-' 后文档为 ——", () => {
    let state = EditorState.create({
      doc: "",
      extensions: [inputRulesExtension()],
    });

    let tr = state.update({
      changes: { from: 0, to: 0, insert: "-" },
      selection: { anchor: 1 },
      userEvent: "input.type",
    });
    state = tr.state;
    expect(state.doc.toString()).toBe("-");

    tr = state.update({
      changes: { from: 1, to: 1, insert: "-" },
      selection: { anchor: 2 },
      userEvent: "input.type",
    });
    state = tr.state;

    expect(state.doc.toString()).toBe("——");
  });
});

describe("AC-004: inputRulesExtension — enabled 谓词门控", () => {
  it("enabled 返回 false 时，中英相邻不插入空格，原样落字", () => {
    let state = EditorState.create({
      doc: "",
      extensions: [inputRulesExtension(() => false)],
    });

    const chars = ["中", "a"];
    for (const ch of chars) {
      const pos = state.doc.length;
      const tr = state.update({
        changes: { from: pos, to: pos, insert: ch },
        selection: { anchor: pos + ch.length },
        userEvent: "input.type",
      });
      state = tr.state;
    }

    expect(state.doc.toString()).toBe("中a");
  });

  it("enabled 返回 false 时，键入双引号不被转换", () => {
    const state = EditorState.create({
      doc: "",
      extensions: [inputRulesExtension(() => false)],
    });
    const tr = state.update({
      changes: { from: 0, to: 0, insert: '"' },
      selection: { anchor: 1 },
      userEvent: "input.type",
    });
    expect(tr.state.doc.toString()).toBe('"');
  });
});

describe("inputRulesExtension — 非单字符输入不受干预", () => {
  it("粘贴多字符文本不触发规则改写（userEvent 非 input.type）", () => {
    const state = EditorState.create({
      doc: "文",
      extensions: [inputRulesExtension()],
    });
    const tr = state.update({
      changes: { from: 1, to: 1, insert: "abc" },
      selection: { anchor: 4 },
      userEvent: "input.paste",
    });
    expect(tr.state.doc.toString()).toBe("文abc");
  });

  it("IME 多字符一次性提交（input.type 但插入长度>1）不触发规则改写", () => {
    const state = EditorState.create({
      doc: "文",
      extensions: [inputRulesExtension()],
    });
    const tr = state.update({
      changes: { from: 1, to: 1, insert: "ab" },
      selection: { anchor: 3 },
      userEvent: "input.type",
    });
    expect(tr.state.doc.toString()).toBe("文ab");
  });

  it("删除操作不触发规则改写", () => {
    const state = EditorState.create({
      doc: "文a",
      extensions: [inputRulesExtension()],
    });
    const tr = state.update({
      changes: { from: 1, to: 2, insert: "" },
      selection: { anchor: 1 },
      userEvent: "delete.backward",
    });
    expect(tr.state.doc.toString()).toBe("文");
  });
});
