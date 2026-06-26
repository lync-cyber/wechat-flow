export interface WechatCredentials {
  appId: string;
  appSecret: string;
}

export function loadWechatCredentials(env: Record<string, string | undefined>): WechatCredentials {
  const appId = env.WECHAT_APP_ID;
  const appSecret = env.WECHAT_APP_SECRET;

  if (!appId) {
    throw new Error("WECHAT_APP_ID is required but not set");
  }
  if (!appSecret) {
    throw new Error("WECHAT_APP_SECRET is required but not set");
  }

  return { appId, appSecret };
}
