import { beforeEach, describe, expect, it } from "vitest";
import {
  renderMarkdown,
  resetBlockRegistry,
  resetVariantRegistry,
} from "../../../packages/core/src/index.ts";
import "../../../packages/blocks/src/index.ts";

beforeEach(() => {
  resetVariantRegistry();
  resetBlockRegistry();
});

// T-183 AC-004b: dropcap/quote-mark 装饰行 line-height 语境豁免（决策②-附，非放宽全局阈值）。
// Exemption guard: 当前（output 相未激活）即 PASS；GREEN 激活 clamp-line-height output 相后，
// 若未正确实现豁免判据（脆弱启发式或漏标记），该 guard 应转红——锁定"不得过度夹取非正文行"。

describe("T-183 AC-004b: dropcap/quote-mark 装饰字元 line-height 语境豁免（决策②-附，过度夹取回归守卫）", () => {
  it("paragraph dropcap 槽 line-height 维持 1（不被夹到 1.2）", async () => {
    const result = await renderMarkdown(":::paragraph{.dropcap}\n首字后面的正文\n:::", {
      themeId: "default",
    });
    const match = result.html.match(/<section style="([^"]*)">首<\/section>/);
    expect(match).not.toBeNull();
    expect(match?.[1]).toMatch(/line-height:\s*1(;|$)/);
  });

  it("quote large-quote-mark 槽 line-height 维持 0.6（不被夹到 1.2）", async () => {
    const result = await renderMarkdown(":::quote{.large-quote-mark}\n引用文字\n:::", {
      themeId: "default",
    });
    const match = result.html.match(/<span style="([^"]*)">"<\/span>/);
    expect(match).not.toBeNull();
    expect(match?.[1]).toMatch(/line-height:\s*0\.6(;|$)/);
  });
});
