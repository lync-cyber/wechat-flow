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
}

export function createWechatAssetUploadHandler(deps: WechatAssetUploadHandlerDeps) {
  const { loadCredentials, upload } = deps;

  return async (job: { data: WechatAssetUploadJobData }): Promise<WechatUploadResult> => {
    const serverCreds = await loadCredentials();

    const uploadCreds: WechatUploadCredentials = {
      appId: serverCreds.appId,
      appSecret: serverCreds.appSecret,
      accessToken: "",
    };

    const { imageUrl, type } = job.data.input;

    return upload({ imageUrl, type }, uploadCreds);
  };
}
