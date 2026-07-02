import { listDocuments, saveDraft } from "@wechat-flow/core";

export const DEMO_DOC_ID = "draft-default";
export const DEMO_DOC_TITLE = "欢迎使用 WechatFlow";

export const DEMO_DOC_CONTENT = `# 欢迎使用 WechatFlow

WechatFlow 是一款面向微信公众号写作者的 Markdown 写作与排版工具。你只需专注内容本身，剩下的排版细节交给它来处理。

## 核心能力

- 用 Markdown 语法快速撰写文章草稿
- 实时预览微信公众号排版效果
- 一键复制粘贴到公众号编辑器，样式不丢失

> 排版不该是写作路上的绊脚石——这正是 WechatFlow 存在的意义。

## 开始写作

在左侧编辑区输入你的 Markdown 内容，右侧会实时渲染出对应的公众号预览效果。完成后即可一键复制到公众号后台发布。
`;

export async function ensureDemoDocument(): Promise<void> {
  const existing = await listDocuments();
  if (existing.length > 0) return;

  await saveDraft({
    id: DEMO_DOC_ID,
    title: DEMO_DOC_TITLE,
    content: DEMO_DOC_CONTENT,
    updatedAt: Date.now(),
  });
}
