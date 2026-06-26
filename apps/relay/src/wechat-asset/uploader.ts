export interface WechatAssetUploadInput {
  imageUrl: string;
  type: "image" | "voice" | "video" | "thumb";
}

export interface WechatUploadCredentials {
  appId: string;
  appSecret: string;
  accessToken: string;
}

export interface WechatUploadResult {
  mediaId: string;
  url: string;
  type: "image" | "voice" | "video" | "thumb";
}

export interface WechatUploaderDeps {
  httpFetch?: (
    url: string,
    init?: RequestInit
  ) => Promise<{ ok: boolean; json(): Promise<unknown> }>;
}

export async function uploadWechatAsset(
  input: WechatAssetUploadInput,
  creds: WechatUploadCredentials,
  deps: WechatUploaderDeps = {}
): Promise<WechatUploadResult> {
  const { httpFetch = fetch } = deps;

  const apiUrl = `https://api.weixin.qq.com/cgi-bin/material/add_material?access_token=${encodeURIComponent(creds.accessToken)}&type=${encodeURIComponent(input.type)}`;

  const response = await httpFetch(apiUrl);
  const body = (await response.json()) as Record<string, unknown>;

  if (typeof body.errcode === "number" && body.errcode !== 0) {
    const err = new Error(String(body.errmsg ?? "WeChat API error")) as Error & { code: string };
    err.code = String(body.errcode);
    throw err;
  }

  return {
    mediaId: String(body.media_id ?? ""),
    url: apiUrl,
    type: input.type,
  };
}
