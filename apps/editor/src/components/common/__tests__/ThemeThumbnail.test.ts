import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import ThemeThumbnail from "../ThemeThumbnail.vue";

describe("ThemeThumbnail: 骨架富预览缩略图", () => {
  it("根为装饰性区块，aria-hidden=true", () => {
    const wrapper = mount(ThemeThumbnail);
    expect(wrapper.find('[data-testid="theme-thumbnail"]').attributes("aria-hidden")).toBe("true");
  });

  it("渲染标题条 + 正文行 + 引用块骨架", () => {
    const wrapper = mount(ThemeThumbnail);
    expect(wrapper.find(".theme-thumbnail__title").exists()).toBe(true);
    expect(wrapper.findAll(".theme-thumbnail__line").length).toBeGreaterThanOrEqual(3);
    expect(wrapper.find(".theme-thumbnail__quote").exists()).toBe(true);
  });

  it("默认 regular 不含 compact 修饰类", () => {
    const wrapper = mount(ThemeThumbnail);
    expect(wrapper.find('[data-testid="theme-thumbnail"]').classes()).not.toContain(
      "theme-thumbnail--compact"
    );
  });

  it("compact=true 时根含 compact 修饰类", () => {
    const wrapper = mount(ThemeThumbnail, { props: { compact: true } });
    expect(wrapper.find('[data-testid="theme-thumbnail"]').classes()).toContain(
      "theme-thumbnail--compact"
    );
  });
});
