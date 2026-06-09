import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import SyncStateIndicator from "../SyncStateIndicator.vue";

// AC-004: syncState drives color and pulse animation
describe("AC-004: SyncStateIndicator 状态驱动色点", () => {
  it("syncState=syncing → 色点 class 含 sync-state-indicator--syncing（--color-brand 色）", () => {
    const wrapper = mount(SyncStateIndicator, { props: { syncState: "syncing" } });
    const dot = wrapper.find('[data-testid="sync-dot"]');
    expect(dot.exists()).toBe(true);
    expect(dot.classes()).toContain("sync-state-indicator--syncing");
    wrapper.unmount();
  });

  it("syncState=syncing → 色点有快速 pulse class（pulse-fast，0.8s 周期）", () => {
    const wrapper = mount(SyncStateIndicator, { props: { syncState: "syncing" } });
    const dot = wrapper.find('[data-testid="sync-dot"]');
    expect(dot.classes()).toContain("sync-state-indicator--pulse-fast");
    wrapper.unmount();
  });

  it("syncState=idle → 色点 class 含 sync-state-indicator--idle（--color-text-muted 色）", () => {
    const wrapper = mount(SyncStateIndicator, { props: { syncState: "idle" } });
    const dot = wrapper.find('[data-testid="sync-dot"]');
    expect(dot.classes()).toContain("sync-state-indicator--idle");
    wrapper.unmount();
  });

  it("syncState=idle → 无 pulse class", () => {
    const wrapper = mount(SyncStateIndicator, { props: { syncState: "idle" } });
    const dot = wrapper.find('[data-testid="sync-dot"]');
    expect(dot.classes()).not.toContain("sync-state-indicator--pulse-fast");
    expect(dot.classes()).not.toContain("sync-state-indicator--pulse-slow");
    wrapper.unmount();
  });

  it("syncState=connecting → 色点含 pulse-slow class（--color-brand-muted，1.5s 周期）", () => {
    const wrapper = mount(SyncStateIndicator, { props: { syncState: "connecting" } });
    const dot = wrapper.find('[data-testid="sync-dot"]');
    expect(dot.classes()).toContain("sync-state-indicator--connecting");
    expect(dot.classes()).toContain("sync-state-indicator--pulse-slow");
    wrapper.unmount();
  });

  it("syncState=synced → 色点含 synced class，无 pulse", () => {
    const wrapper = mount(SyncStateIndicator, { props: { syncState: "synced" } });
    const dot = wrapper.find('[data-testid="sync-dot"]');
    expect(dot.classes()).toContain("sync-state-indicator--synced");
    expect(dot.classes()).not.toContain("sync-state-indicator--pulse-fast");
    expect(dot.classes()).not.toContain("sync-state-indicator--pulse-slow");
    wrapper.unmount();
  });

  it("syncState=error → 色点含 error class（--color-error），无 pulse", () => {
    const wrapper = mount(SyncStateIndicator, { props: { syncState: "error" } });
    const dot = wrapper.find('[data-testid="sync-dot"]');
    expect(dot.classes()).toContain("sync-state-indicator--error");
    expect(dot.classes()).not.toContain("sync-state-indicator--pulse-fast");
    expect(dot.classes()).not.toContain("sync-state-indicator--pulse-slow");
    wrapper.unmount();
  });

  it("syncState=offline → 色点含 offline class（--color-warning），无 pulse", () => {
    const wrapper = mount(SyncStateIndicator, { props: { syncState: "offline" } });
    const dot = wrapper.find('[data-testid="sync-dot"]');
    expect(dot.classes()).toContain("sync-state-indicator--offline");
    expect(dot.classes()).not.toContain("sync-state-indicator--pulse-fast");
    expect(dot.classes()).not.toContain("sync-state-indicator--pulse-slow");
    wrapper.unmount();
  });

  it("syncState=conflict → 显示「冲突」Tag", () => {
    const wrapper = mount(SyncStateIndicator, { props: { syncState: "conflict" } });
    const tag = wrapper.find('[data-testid="sync-conflict-tag"]');
    expect(tag.exists()).toBe(true);
    expect(tag.text()).toBe("冲突");
    wrapper.unmount();
  });

  it("syncState=idle → 不显示「冲突」Tag", () => {
    const wrapper = mount(SyncStateIndicator, { props: { syncState: "idle" } });
    expect(wrapper.find('[data-testid="sync-conflict-tag"]').exists()).toBe(false);
    wrapper.unmount();
  });
});
