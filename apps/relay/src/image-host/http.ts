export interface HttpRequestInit {
  method: string;
  headers?: Record<string, string>;
  body?: FormData | ArrayBuffer | string;
}

export type HttpRequest = (
  url: string,
  init: HttpRequestInit
) => Promise<{ ok: boolean; status: number; json(): Promise<unknown>; text(): Promise<string> }>;

export const defaultHttpRequest: HttpRequest = (url, init) => fetch(url, init);
