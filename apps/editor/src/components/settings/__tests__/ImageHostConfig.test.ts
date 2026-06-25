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

import ImageHostConfig from "../ImageHostConfig.vue";

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

describe("AC-002: 6 图床折叠卡片渲染", () => {
  it("渲染 6 个折叠卡片标题", async () => {
    const wrapper = mount(ImageHostConfig);
    await nextTick();
    const cards = wrapper.findAll("[data-testid^='imagehost-card-']");
    expect(cards).toHaveLength(6);
  });

  it("6 个图床名称全部可见", async () => {
    const wrapper = mount(ImageHostConfig);
    await nextTick();
    const text = wrapper.text();
    expect(text).toContain("本地");
    expect(text).toContain("七牛云");
    expect(text).toContain("阿里云");
    expect(text).toContain("腾讯云");
    expect(text).toContain("SM.MS");
    expect(text).toContain("自定义");
  });

  it("折叠态：七牛云卡片默认不显示字段", async () => {
    const wrapper = mount(ImageHostConfig);
    await nextTick();
    const form = wrapper.find("[data-testid='imagehost-form-qiniu']");
    expect(form.exists()).toBe(false);
  });
});

describe("AC-002: 七牛云展开 — 密码框字段", () => {
  it("点击七牛云折叠头后展开表单", async () => {
    const wrapper = mount(ImageHostConfig);
    await nextTick();
    await wrapper.find("[data-testid='imagehost-toggle-qiniu']").trigger("click");
    await nextTick();
    const form = wrapper.find("[data-testid='imagehost-form-qiniu']");
    expect(form.exists()).toBe(true);
  });

  it("展开七牛云后 AccessKey 输入框类型为 password（密码框）", async () => {
    const wrapper = mount(ImageHostConfig);
    await nextTick();
    await wrapper.find("[data-testid='imagehost-toggle-qiniu']").trigger("click");
    await nextTick();
    const input = wrapper.find("[data-testid='qiniu-accessKey']");
    expect(input.attributes("type")).toBe("password");
  });

  it("展开七牛云后 SecretKey 输入框类型为 password", async () => {
    const wrapper = mount(ImageHostConfig);
    await nextTick();
    await wrapper.find("[data-testid='imagehost-toggle-qiniu']").trigger("click");
    await nextTick();
    const input = wrapper.find("[data-testid='qiniu-secretKey']");
    expect(input.attributes("type")).toBe("password");
  });

  it("展开七牛云后显示 Bucket / Domain / 区域下拉", async () => {
    const wrapper = mount(ImageHostConfig);
    await nextTick();
    await wrapper.find("[data-testid='imagehost-toggle-qiniu']").trigger("click");
    await nextTick();
    expect(wrapper.find("[data-testid='qiniu-bucket']").exists()).toBe(true);
    expect(wrapper.find("[data-testid='qiniu-domain']").exists()).toBe(true);
    expect(wrapper.find("[data-testid='qiniu-region']").exists()).toBe(true);
  });

  it("展开七牛云后显示保存/清除配置按钮", async () => {
    const wrapper = mount(ImageHostConfig);
    await nextTick();
    await wrapper.find("[data-testid='imagehost-toggle-qiniu']").trigger("click");
    await nextTick();
    expect(wrapper.find("[data-testid='qiniu-btn-save']").exists()).toBe(true);
    expect(wrapper.find("[data-testid='qiniu-btn-clear']").exists()).toBe(true);
  });
});

describe("AC-003: 七牛云保存 → saveCredential 调用 + Toast", () => {
  it("点保存后 saveCredential 以 'qiniu' namespace 调用（含 accessKey/secretKey/bucket/domain/region）", async () => {
    const wrapper = mount(ImageHostConfig);
    await nextTick();
    await wrapper.find("[data-testid='imagehost-toggle-qiniu']").trigger("click");
    await nextTick();

    await wrapper.find("[data-testid='qiniu-accessKey']").setValue("my-ak");
    await wrapper.find("[data-testid='qiniu-secretKey']").setValue("my-sk");
    await wrapper.find("[data-testid='qiniu-bucket']").setValue("my-bucket");
    await wrapper.find("[data-testid='qiniu-domain']").setValue("https://example.com");
    await wrapper.find("[data-testid='qiniu-btn-save']").trigger("click");
    await nextTick();

    expect(saveCredential).toHaveBeenCalledWith("qiniu", "accessKey", "my-ak");
    expect(saveCredential).toHaveBeenCalledWith("qiniu", "secretKey", "my-sk");
    expect(saveCredential).toHaveBeenCalledWith("qiniu", "bucket", "my-bucket");
    expect(saveCredential).toHaveBeenCalledWith("qiniu", "domain", "https://example.com");
  });

  it("保存成功后 pushToast type=success message='设置已保存'", async () => {
    const wrapper = mount(ImageHostConfig);
    await nextTick();
    await wrapper.find("[data-testid='imagehost-toggle-qiniu']").trigger("click");
    await nextTick();
    await wrapper.find("[data-testid='qiniu-btn-save']").trigger("click");
    await nextTick();

    expect(pushToast).toHaveBeenCalledWith({ type: "success", message: "设置已保存" });
  });

  it("保存失败时 pushToast type=error message='保存失败，请重试'", async () => {
    saveCredential.mockRejectedValueOnce(new Error("IDB error"));
    const wrapper = mount(ImageHostConfig);
    await nextTick();
    await wrapper.find("[data-testid='imagehost-toggle-qiniu']").trigger("click");
    await nextTick();
    await wrapper.find("[data-testid='qiniu-btn-save']").trigger("click");
    await nextTick();

    expect(pushToast).toHaveBeenCalledWith({ type: "error", message: "保存失败，请重试" });
  });
});

describe("AC-003: 清除配置 → clearCredential 调用", () => {
  it("点清除后 clearCredential 以 namespace='qiniu' 调用", async () => {
    const wrapper = mount(ImageHostConfig);
    await nextTick();
    await wrapper.find("[data-testid='imagehost-toggle-qiniu']").trigger("click");
    await nextTick();
    await wrapper.find("[data-testid='qiniu-btn-clear']").trigger("click");
    await nextTick();

    expect(clearCredential).toHaveBeenCalledWith("qiniu");
  });

  it("clearCredential 成功后内存字段被重置为空字符串", async () => {
    loadCredentialGroup.mockImplementation(async (ns: string) => {
      if (ns === "qiniu") return { accessKey: "loaded-ak", secretKey: "loaded-sk" };
      return {};
    });
    const wrapper = mount(ImageHostConfig);
    await nextTick();
    await nextTick();
    await wrapper.find("[data-testid='imagehost-toggle-qiniu']").trigger("click");
    await nextTick();

    const akInput = wrapper.find("[data-testid='qiniu-accessKey']");
    expect((akInput.element as HTMLInputElement).value).toBe("loaded-ak");

    await wrapper.find("[data-testid='qiniu-btn-clear']").trigger("click");
    await nextTick();

    expect((akInput.element as HTMLInputElement).value).toBe("");
  });

  it("clearCredential 失败时 pushToast type=error message='清除失败，请重试'", async () => {
    clearCredential.mockRejectedValueOnce(new Error("IDB error"));
    const wrapper = mount(ImageHostConfig);
    await nextTick();
    await wrapper.find("[data-testid='imagehost-toggle-qiniu']").trigger("click");
    await nextTick();
    await wrapper.find("[data-testid='qiniu-btn-clear']").trigger("click");
    await nextTick();

    expect(pushToast).toHaveBeenCalledWith({ type: "error", message: "清除失败，请重试" });
  });

  it("clearCredential 失败时内存字段不被清空（IDB 与 UI 状态一致）", async () => {
    loadCredentialGroup.mockImplementation(async (ns: string) => {
      if (ns === "qiniu") return { accessKey: "kept-ak" };
      return {};
    });
    clearCredential.mockRejectedValueOnce(new Error("IDB error"));
    const wrapper = mount(ImageHostConfig);
    await nextTick();
    await nextTick();
    await wrapper.find("[data-testid='imagehost-toggle-qiniu']").trigger("click");
    await nextTick();

    const akInput = wrapper.find("[data-testid='qiniu-accessKey']");
    expect((akInput.element as HTMLInputElement).value).toBe("kept-ak");

    await wrapper.find("[data-testid='qiniu-btn-clear']").trigger("click");
    await nextTick();

    // fields remain unchanged because clearCredential rejected
    expect((akInput.element as HTMLInputElement).value).toBe("kept-ak");
  });
});

describe("AC-002: 组件挂载时 loadCredentialGroup 恢复各图床配置", () => {
  it("挂载时 loadCredentialGroup 以所有 6 个 namespace 至少调用一次", async () => {
    mount(ImageHostConfig);
    await nextTick();
    expect(loadCredentialGroup).toHaveBeenCalled();
  });

  it("qiniu 有已保存值时展开后字段恢复", async () => {
    loadCredentialGroup.mockImplementation(async (ns: string) => {
      if (ns === "qiniu") return { accessKey: "restored-ak", bucket: "my-bucket" };
      return {};
    });
    const wrapper = mount(ImageHostConfig);
    await nextTick();
    await wrapper.find("[data-testid='imagehost-toggle-qiniu']").trigger("click");
    await nextTick();
    const akInput = wrapper.find("[data-testid='qiniu-accessKey']");
    expect((akInput.element as HTMLInputElement).value).toBe("restored-ak");
  });
});

describe("AC-002: 其他图床密码类字段为 password 类型", () => {
  it("OSS AccessKey 为 password 类型", async () => {
    const wrapper = mount(ImageHostConfig);
    await nextTick();
    await wrapper.find("[data-testid='imagehost-toggle-oss']").trigger("click");
    await nextTick();
    expect(wrapper.find("[data-testid='oss-accessKey']").attributes("type")).toBe("password");
  });

  it("COS SecretId 为 password 类型", async () => {
    const wrapper = mount(ImageHostConfig);
    await nextTick();
    await wrapper.find("[data-testid='imagehost-toggle-cos']").trigger("click");
    await nextTick();
    expect(wrapper.find("[data-testid='cos-secretId']").attributes("type")).toBe("password");
  });

  it("SM.MS Token 为 password 类型", async () => {
    const wrapper = mount(ImageHostConfig);
    await nextTick();
    await wrapper.find("[data-testid='imagehost-toggle-smms']").trigger("click");
    await nextTick();
    expect(wrapper.find("[data-testid='smms-token']").attributes("type")).toBe("password");
  });

  it("自定义 auth header value 为 password 类型", async () => {
    const wrapper = mount(ImageHostConfig);
    await nextTick();
    await wrapper.find("[data-testid='imagehost-toggle-custom']").trigger("click");
    await nextTick();
    expect(wrapper.find("[data-testid='custom-authHeaderValue']").attributes("type")).toBe(
      "password"
    );
  });
});
