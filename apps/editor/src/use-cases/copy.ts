import { simulatePaste } from "@wechat-flow/core";
import { buildDualMimePayload } from "./dual-mime-payload.ts";
import { composeRender } from "./render.ts";

export interface ComposeCopyInput {
  markdown: string;
  themeId?: string;
  notify?: (notification: { type: "success" | "error" | "warning"; message: string }) => void;
}

function fallbackCopyToClipboard(plainText: string): void {
  const ta = document.createElement("textarea");
  ta.value = plainText;
  ta.style.position = "fixed";
  ta.style.top = "-9999px";
  ta.style.left = "-9999px";
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  try {
    if (typeof document.execCommand === "function") {
      document.execCommand("copy");
    }
  } finally {
    document.body.removeChild(ta);
  }
}

export async function composeCopy(input: ComposeCopyInput): Promise<void> {
  const rendered = await composeRender({ markdown: input.markdown, themeId: input.themeId });
  const { filteredHtml } = simulatePaste(rendered.html);
  const plainText = rendered.html.replace(/<[^>]+>/g, "");
  const payload = buildDualMimePayload(filteredHtml, plainText);
  try {
    await navigator.clipboard.write(payload);
    input.notify?.({ type: "success", message: "已复制到剪贴板" });
  } catch {
    const isDesktop = typeof window !== "undefined" && window.innerWidth >= 768;
    if (isDesktop) {
      fallbackCopyToClipboard(plainText);
      input.notify?.({
        type: "warning",
        message: "已自动复制纯文本，如未生效请按 Ctrl/Cmd+C 手动复制",
      });
    } else {
      input.notify?.({ type: "error", message: "复制失败" });
    }
  }
}
