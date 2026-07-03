import { composeExportHtml as defaultComposeExportHtml } from "../use-cases/export-html.ts";
import { useEditorSession } from "./use-editor-session.ts";
import type { EventSourceFactory } from "./use-sse-job.ts";
import { useSseJob } from "./use-sse-job.ts";

export interface ExportLongImageInput {
  markdown: string;
  themeId?: string;
}

interface ExportLongImageOptions {
  fetchImpl?: typeof fetch;
  getSessionToken?: () => Promise<string | undefined>;
  composeExportHtml?: (input: ExportLongImageInput) => Promise<string>;
  eventSourceFactory?: EventSourceFactory;
}

interface EnqueueError {
  code: string;
  message: string;
}

export function useExportLongImage(options: ExportLongImageOptions = {}) {
  const fetchImpl = options.fetchImpl ?? globalThis.fetch.bind(globalThis);
  const composeHtml = options.composeExportHtml ?? defaultComposeExportHtml;

  let getSessionToken: () => Promise<string | undefined>;
  if (options.getSessionToken) {
    getSessionToken = options.getSessionToken;
  } else {
    const session = useEditorSession({ fetchImpl });
    getSessionToken = session.getSessionToken;
  }

  const sseJob = useSseJob(options.eventSourceFactory);
  const { status, percent, result, error, start: startSse, stop } = sseJob;

  function setEnqueueError(err: EnqueueError): void {
    error.value = err;
    status.value = "failed";
  }

  async function start(input: ExportLongImageInput): Promise<void> {
    error.value = undefined;
    status.value = "queued";
    percent.value = 0;

    const html = await composeHtml(input);
    const token = await getSessionToken();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;

    try {
      const res = await fetchImpl("/api/v1/jobs", {
        method: "POST",
        headers,
        body: JSON.stringify({ kind: "long-image-render", input: { html } }),
      });

      if (!res.ok) {
        const body = (await res
          .json()
          .catch(() => ({ error: { code: String(res.status), message: "enqueue failed" } }))) as {
          error?: EnqueueError;
        };
        setEnqueueError(body.error ?? { code: String(res.status), message: "enqueue failed" });
        return;
      }

      const data = (await res.json()) as { jobId: string };
      startSse(data.jobId);
    } catch {
      setEnqueueError({ code: "E_NETWORK", message: "无法连接导出服务" });
    }
  }

  return { status, percent, result, error, start, stop };
}
