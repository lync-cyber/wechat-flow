import { composeCopy } from "./copy.ts";

export interface MobileCopyInput {
  markdown: string;
  themeId?: string;
  previewHtml?: string;
  notify: (notification: { type: "success" | "error" | "warning"; message: string }) => void;
}

export async function mobileCopy(input: MobileCopyInput): Promise<void> {
  const clipboardAvailable =
    typeof navigator !== "undefined" && typeof navigator.clipboard?.write === "function";

  if (clipboardAvailable) {
    await composeCopy({
      markdown: input.markdown,
      themeId: input.themeId,
      notify: (n) => input.notify(n),
    });
    return;
  }

  // Fallback: textarea + execCommand
  const text = input.previewHtml ?? input.markdown;
  const ta = document.createElement("textarea");
  ta.value = text;
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
  input.notify({ type: "warning", message: "请手动长按复制" });
}
