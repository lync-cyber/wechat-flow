export interface DirectiveContent {
  attrs?: string;
  body?: string;
}

export const DEFAULT_DIRECTIVE_BODY = "这是用于微信粘贴安全校验的示例正文内容。";

export const DIRECTIVE_CONTENT_BY_BLOCK: Record<string, (variantId: string) => DirectiveContent> = {
  gallery: () => ({
    body: [
      '- ![图一](https://example.com/1.png "示例说明一")',
      '- ![图二](https://example.com/2.png "示例说明二")',
      '- ![图三](https://example.com/3.png "示例说明三")',
    ].join("\n"),
  }),
  steps: () => ({
    body: [
      "- **第一步**：完成准备工作",
      "- **第二步**：执行核心操作",
      "- **第三步**：验收交付结果",
    ].join("\n"),
  }),
  list: () => ({
    body: ["- 列表项目一", "- 列表项目二", "- 列表项目三"].join("\n"),
  }),
  "code-block": () => ({
    body: ["```js", "const total = items.length;", "console.log(total);", "```"].join("\n"),
  }),
  compare: (variantId) =>
    variantId === "ledger"
      ? {
          attrs:
            ' left-label="优点" left-value="速度快" right-label="缺点" right-value="成本高" title="方案对比"',
        }
      : { body: "**方案 A** 与 **方案 B** 的对比说明文字。" },
  dialog: () => ({ attrs: ' speaker="测试对象"', body: "这是一轮对话内容示例。" }),
  "pull-quote": (variantId) =>
    variantId === "decorated"
      ? { attrs: ' author="测试作者"', body: "这句话值得被单独强调。" }
      : { body: "这句话值得被单独强调。" },
};

export function synthesizeDirectiveContent(blockId: string, variantId: string): DirectiveContent {
  const builder = DIRECTIVE_CONTENT_BY_BLOCK[blockId];
  if (builder) return builder(variantId);
  return { body: DEFAULT_DIRECTIVE_BODY };
}

export function buildDirectiveMarkdown(blockId: string, variantId: string): string {
  const { attrs = "", body } = synthesizeDirectiveContent(blockId, variantId);
  const header = `:::${blockId}{.${variantId}${attrs}}`;
  return body ? `${header}\n${body}\n:::` : `${header}\n:::`;
}
