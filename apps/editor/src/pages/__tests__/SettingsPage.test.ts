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
vi.mock("../../composables/use-toast.ts", () => ({
  useToast: () => ({
    toasts: { value: [] },
    pushToast,
    dismissToast: vi.fn(),
  }),
}));

import SettingsPage from "../SettingsPage.vue";

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

describe("AC-001: 左侧导航项渲染", () => {
  it("渲染 6 个导航分组项", async () => {
    const wrapper = mount(SettingsPage, {
      global: { plugins: [createPinia()] },
    });
    await nextTick();
    const navItems = wrapper.findAll("[data-testid^='settings-nav-']");
    expect(navItems).toHaveLength(6);
  });

  it("导航包含「编辑器」「主题与品牌」「同步与协作」「图床配置」「API 密钥」「关于」", async () => {
    const wrapper = mount(SettingsPage, {
      global: { plugins: [createPinia()] },
    });
    await nextTick();
    const text = wrapper.text();
    expect(text).toContain("编辑器");
    expect(text).toContain("主题与品牌");
    expect(text).toContain("同步与协作");
    expect(text).toContain("图床配置");
    expect(text).toContain("API 密钥");
    expect(text).toContain("关于");
  });

  it("默认选中「编辑器」导航项（active class）", async () => {
    const wrapper = mount(SettingsPage, {
      global: { plugins: [createPinia()] },
    });
    await nextTick();
    const activeItem = wrapper.find("[data-testid='settings-nav-editor']");
    expect(activeItem.classes()).toContain("settings-nav__item--active");
  });
});

describe("AC-002: 点击「图床配置」切换右侧内容", () => {
  it("点击「图床配置」后右侧内容区挂载 ImageHostConfig（含 6 个折叠卡片）", async () => {
    const wrapper = mount(SettingsPage, {
      global: { plugins: [createPinia()] },
    });
    await nextTick();
    await wrapper.find("[data-testid='settings-nav-imagehost']").trigger("click");
    await nextTick();
    const cards = wrapper.findAll("[data-testid^='imagehost-card-']");
    expect(cards).toHaveLength(6);
  });

  it("点击「图床配置」后内容区显示图床配置标题区", async () => {
    const wrapper = mount(SettingsPage, {
      global: { plugins: [createPinia()] },
    });
    await nextTick();
    await wrapper.find("[data-testid='settings-nav-imagehost']").trigger("click");
    await nextTick();
    expect(wrapper.find("[data-testid='settings-content-imagehost']").exists()).toBe(true);
  });
});

describe("AC-004: 点击「API 密钥」切换右侧内容", () => {
  it("点击「API 密钥」后右侧显示 AppSecret 密码框", async () => {
    const wrapper = mount(SettingsPage, {
      global: { plugins: [createPinia()] },
    });
    await nextTick();
    await wrapper.find("[data-testid='settings-nav-apikey']").trigger("click");
    await nextTick();
    const input = wrapper.find("[data-testid='wechat-appSecret']");
    expect(input.attributes("type")).toBe("password");
  });
});

describe("AC-001: 导航点击切换 active 项", () => {
  it("点击「图床配置」后 imagehost 项获得 active class，editor 项失去 active class", async () => {
    const wrapper = mount(SettingsPage, {
      global: { plugins: [createPinia()] },
    });
    await nextTick();
    await wrapper.find("[data-testid='settings-nav-imagehost']").trigger("click");
    await nextTick();
    expect(wrapper.find("[data-testid='settings-nav-imagehost']").classes()).toContain(
      "settings-nav__item--active"
    );
    expect(wrapper.find("[data-testid='settings-nav-editor']").classes()).not.toContain(
      "settings-nav__item--active"
    );
  });
});
