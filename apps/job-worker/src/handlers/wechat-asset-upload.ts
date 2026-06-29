import type {
  WechatAssetUploadInput,
  WechatCredentials,
  WechatUploadCredentials,
  WechatUploadResult,
} from "@wechat-flow/relay";

export interface WechatAssetUploadJobData {
  kind: "wechat-asset-upload";
  apiKeyId: string;
  input: WechatAssetUploadInput;
}

export interface WechatAssetUploadHandlerDeps {
  loadCredentials: () => Promise<WechatCredentials>;
  upload: (
    input: WechatAssetUploadInput,
    creds: WechatUploadCredentials
  ) => Promise<WechatUploadResult>;
  getAccessToken: (appId: string, appSecret: string) => Promise<string>;
  /** Injectable clock for testing; defaults to Date.now */
  clock?: () => number;
  /** Cache TTL in seconds; defaults to 7100 (well under the 7200s WeChat limit) */
  tokenTtlSeconds?: number;
}

export function createWechatAssetUploadHandler(deps: WechatAssetUploadHandlerDeps) {
  const {
    loadCredentials,
    upload,
    getAccessToken,
    clock = () => Date.now(),
    tokenTtlSeconds = 7100,
  } = deps;

  let cachedToken: string | null = null;
  let cacheExpiresAt = 0;

  return async (job: { data: WechatAssetUploadJobData }): Promise<WechatUploadResult> => {
    const serverCreds = await loadCredentials();

    const now = clock();
    if (cachedToken === null || now >= cacheExpiresAt) {
      cachedToken = await getAccessToken(serverCreds.appId, serverCreds.appSecret);
      cacheExpiresAt = now + tokenTtlSeconds * 1000;
    }

    const uploadCreds: WechatUploadCredentials = {
      appId: serverCreds.appId,
      appSecret: serverCreds.appSecret,
      accessToken: cachedToken,
    };

    const { imageUrl, type } = job.data.input;

    return upload({ imageUrl, type }, uploadCreds);
  };
}
