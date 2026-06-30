import { EditorState } from "@codemirror/state";
import { describe, expect, it } from "vitest";
import { type WordCount, countWords, wordCountField } from "../word-count.ts";

describe("AC-006: countWords — 纯函数计数", () => {
  it("空串返回 {chineseChars:0, totalChars:0}", () => {
    const result: WordCount = countWords("");
    expect(result.chineseChars).toBe(0);
    expect(result.totalChars).toBe(0);
  });

  it("纯中文文本 '你好世界' chineseChars=4，totalChars=4", () => {
    const result = countWords("你好世界");
    expect(result.chineseChars).toBe(4);
    expect(result.totalChars).toBe(4);
  });

  it("纯英文 'hello' chineseChars=0，totalChars=5", () => {
    const result = countWords("hello");
    expect(result.chineseChars).toBe(0);
    expect(result.totalChars).toBe(5);
  });

  it("中英混排 '中文abc 123' chineseChars=2，totalChars=9", () => {
    const result = countWords("中文abc 123");
    expect(result.chineseChars).toBe(2);
    expect(result.totalChars).toBe(9);
  });

  it("含标点和数字 '你好，世界！123' chineseChars=4，totalChars=9", () => {
    // 你好，世界！123 = 9 code points（2 CJK + ，+ 2 CJK + ！+ 3 digits）
    const result = countWords("你好，世界！123");
    expect(result.chineseChars).toBe(4);
    expect(result.totalChars).toBe(9);
  });

  it("AC-005 语义：空文档 countWords 对应 '0 字 / 0 字符'", () => {
    const result = countWords("");
    expect(result.chineseChars).toBe(0);
    expect(result.totalChars).toBe(0);
  });
});

describe("AC-006: wordCountField — StateField 集成", () => {
  it("EditorState 含 wordCountField，初始 doc '你好世界' 返回 chineseChars=4", () => {
    const state = EditorState.create({
      doc: "你好世界",
      extensions: [wordCountField],
    });
    const wc = state.field(wordCountField);
    expect(wc.chineseChars).toBe(4);
  });

  it("EditorState 含 wordCountField，初始 doc 'hello' 返回 totalChars=5", () => {
    const state = EditorState.create({
      doc: "hello",
      extensions: [wordCountField],
    });
    const wc = state.field(wordCountField);
    expect(wc.totalChars).toBe(5);
  });

  it("doc 变更后 wordCountField 更新", () => {
    const state = EditorState.create({
      doc: "abc",
      extensions: [wordCountField],
    });
    const newState = state.update({
      changes: { from: 0, to: 3, insert: "你好世界" },
    }).state;
    const wc = newState.field(wordCountField);
    expect(wc.chineseChars).toBe(4);
    expect(wc.totalChars).toBe(4);
  });
});
