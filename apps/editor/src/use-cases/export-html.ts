import { composeRender } from "./render.ts";

export interface ComposeExportHtmlInput {
  markdown: string;
  themeId?: string;
}

const HEAD_STYLES = `<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif,"Apple Color Emoji","Segoe UI Emoji","Segoe UI Symbol";line-height:1.6;color:#333;word-wrap:break-word}
img{max-width:100%}
</style>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>`;

export async function composeExportHtml(input: ComposeExportHtmlInput): Promise<string> {
  const rendered = await composeRender({
    markdown: input.markdown,
    themeId: input.themeId,
    injectNodeIds: false,
  });

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
${HEAD_STYLES}
</head>
<body>
${rendered.html}
</body>
</html>`;
}
