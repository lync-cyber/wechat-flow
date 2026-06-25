import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";

const { saveCredential, loadCredentialGroup, clearCredential } = vi.hoisted(() => ({
  saveCredential: vi.fn().mockResolvedValue(undefined),
  loadCredentialGroup: vi.fn().mockResolvedValue({}),
  clearCredential: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@wechat-flow/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@wechat-flow/core")>();
  return {
    ...actual,
    saveCredential,
    loadCredentialGroup,
    clearCredential,
  };
});

const { pushToast } = vi.hoisted(() => ({ pushToast: vi.fn() }));
vi.mock("../../../composables/use-toast.ts", () => ({
  useToast: () => ({
    toasts: { value: [] },
    pushToast,
    dismissToast: vi.fn(),
  }),
}));

import ApiKeyConfig from "../ApiKeyConfig.vue";

beforeEach(() => {
  setActivePinia(createPinia());
  saveCredential.mockClear();
  loadCredentialGroup.mockClear();
  clearCredential.mockClear();
  pushToast.mockClear();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("AC-004: AppSecret 密码框默认不明文显示", () => {
  it("AppSecret 输入框初始 type=password", async () => {
    const wrapper = mount(ApiKeyConfig);
    await nextTick();
    const input = wrapper.find("[data-testid='wechat-appSecret']");
    expect(input.attributes("type")).toBe("password");
  });

  it("AppID 输入框为文本类型（非 password）", async () => {
    const wrapper = mount(ApiKeyConfig);
    await nextTick();
    const input = wrapper.find("[data-testid='wechat-appId']");
    expect(input.attributes("type")).toBe("text");
  });
});

describe("AC-004: 眼睛图标切换 AppSecret 明/暗", () => {
  it("眼睛切换按钮存在", async () => {
    const wrapper = mount(ApiKeyConfig);
    await nextTick();
    expect(wrapper.find("[data-testid='wechat-appSecret-toggle']").exists()).toBe(true);
  });

  it("点击眼睛图标后 AppSecret 切换为 text 类型（明文）", async () => {
    const wrapper = mount(ApiKeyConfig);
    await nextTick();
    await wrapper.find("[data-testid='wechat-appSecret-toggle']").trigger("click");
    await nextTick();
    const input = wrapper.find("[data-testid='wechat-appSecret']");
    expect(input.attributes("type")).toBe("text");
  });

  it("再次点击眼睛图标后切换回 password（暗）", async () => {
    const wrapper = mount(ApiKeyConfig);
    await nextTick();
    await wrapper.find("[data-testid='wechat-appSecret-toggle']").trigger("click");
    await nextTick();
    await wrapper.find("[data-testid='wechat-appSecret-toggle']").trigger("click");
    await nextTick();
    const input = wrapper.find("[data-testid='wechat-appSecret']");
    expect(input.attributes("type")).toBe("password");
  });
});

describe("AC-004: 保存 API 密钥 → saveCredential 调用 + Toast", () => {
  it("点保存后 saveCredential 以 'wechat' namespace 保存 appId 和 appSecret", async () => {
    const wrapper = mount(ApiKeyConfig);
    await nextTick();
    await wrapper.find("[data-testid='wechat-appId']").setValue("wx_test_appid");
    await wrapper.find("[data-testid='wechat-appSecret']").setValue("super-secret");
    await wrapper.find("[data-testid='wechat-btn-save']").trigger("click");
    await nextTick();

    expect(saveCredential).toHaveBeenCalledWith("wechat", "appId", "wx_test_appid");
    expect(saveCredential).toHaveBeenCalledWith("wechat", "appSecret", "super-secret");
  });

  it("保存成功后 pushToast type=success message='设置已保存'", async () => {
    const wrapper = mount(ApiKeyConfig);
    await nextTick();
    await wrapper.find("[data-testid='wechat-btn-save']").trigger("click");
    await nextTick();

    expect(pushToast).toHaveBeenCalledWith({ type: "success", message: "设置已保存" });
  });

  it("保存失败时 pushToast type=error message='保存失败，请重试'", async () => {
    saveCredential.mockRejectedValueOnce(new Error("fail"));
    const wrapper = mount(ApiKeyConfig);
    await nextTick();
    await wrapper.find("[data-testid='wechat-btn-save']").trigger("click");
    await nextTick();

    expect(pushToast).toHaveBeenCalledWith({ type: "error", message: "保存失败，请重试" });
  });
});

describe("AC-004: 挂载时恢复 wechat namespace 凭据", () => {
  it("挂载时 loadCredentialGroup 以 'wechat' 调用", async () => {
    mount(ApiKeyConfig);
    await nextTick();
    expect(loadCredentialGroup).toHaveBeenCalledWith("wechat");
  });

  it("有保存值时挂载后 appId 字段恢复", async () => {
    loadCredentialGroup.mockResolvedValueOnce({ appId: "wx_saved_id", appSecret: "" });
    const wrapper = mount(ApiKeyConfig);
    await nextTick();
    await nextTick();
    const appIdInput = wrapper.find("[data-testid='wechat-appId']");
    expect((appIdInput.element as HTMLInputElement).value).toBe("wx_saved_id");
  });
});
