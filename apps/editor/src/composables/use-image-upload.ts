import { ref } from "vue";
import { useEditorSession } from "./use-editor-session";

export type UploadState = "idle" | "dragging" | "uploading" | "success" | "error";

export interface UploadResult {
  url: string;
  size: number;
}

interface ImageUploadOptions {
  uploadImage?: (file: File) => Promise<UploadResult>;
  getSessionToken?: () => Promise<string | undefined>;
  fetchImpl?: typeof fetch;
}

async function defaultUploadImage(
  file: File,
  getToken: () => Promise<string | undefined>,
  fetchImpl: typeof fetch
): Promise<UploadResult> {
  const token = await getToken();
  const formData = new FormData();
  formData.append("file", file);
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetchImpl("/api/v1/images/upload", {
    method: "POST",
    body: formData,
    headers,
  });
  if (!res.ok) {
    const err = (await res
      .json()
      .catch(() => ({ error: { code: String(res.status), message: res.statusText } }))) as {
      error?: { code: string; message: string };
    };
    const e = err.error ?? { code: String(res.status), message: res.statusText };
    throw Object.assign(new Error(e.message), { code: e.code });
  }
  return res.json() as Promise<UploadResult>;
}

export function useImageUpload(options: ImageUploadOptions = {}) {
  const state = ref<UploadState>("idle");
  const progress = ref(0);
  const previewUrl = ref<string | undefined>(undefined);
  const errorMsg = ref<string | undefined>(undefined);

  let lastFile: File | undefined;
  const fetchImpl = options.fetchImpl ?? globalThis.fetch.bind(globalThis);
  let getSessionToken: () => Promise<string | undefined>;

  if (options.getSessionToken) {
    getSessionToken = options.getSessionToken;
  } else {
    const session = useEditorSession({ fetchImpl });
    getSessionToken = session.getSessionToken;
  }

  const uploadImageFn = options.uploadImage
    ? options.uploadImage
    : (file: File) => defaultUploadImage(file, getSessionToken, fetchImpl);

  function startDrag(): void {
    state.value = "dragging";
  }

  function endDrag(): void {
    if (state.value === "dragging") state.value = "idle";
  }

  async function upload(file: File): Promise<string | undefined> {
    lastFile = file;
    state.value = "uploading";
    progress.value = 0;
    errorMsg.value = undefined;
    try {
      const result = await uploadImageFn(file);
      previewUrl.value = result.url;
      state.value = "success";
      return result.url;
    } catch (err) {
      const e = err as { message?: string; code?: string };
      errorMsg.value = e.message ?? "上传失败";
      state.value = "error";
      return undefined;
    }
  }

  async function retry(): Promise<string | undefined> {
    if (!lastFile) return undefined;
    return upload(lastFile);
  }

  function cancel(): void {
    state.value = "idle";
    errorMsg.value = undefined;
    progress.value = 0;
  }

  return { state, progress, previewUrl, errorMsg, startDrag, endDrag, upload, retry, cancel };
}
