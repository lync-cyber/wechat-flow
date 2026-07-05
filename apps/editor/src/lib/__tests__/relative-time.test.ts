import { describe, expect, it } from "vitest";
import { formatRelativeTime } from "../relative-time.ts";

const NOW = 1_800_000_000_000;
const SEC = 1000;
const MIN = 60 * SEC;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

describe("formatRelativeTime", () => {
  it("30 秒内显示「刚刚」", () => {
    expect(formatRelativeTime(NOW - 30 * SEC, NOW)).toBe("刚刚");
  });

  it("分钟级显示「N 分钟前」", () => {
    expect(formatRelativeTime(NOW - 2 * MIN, NOW)).toBe("2 分钟前");
  });

  it("小时级显示「N 小时前」", () => {
    expect(formatRelativeTime(NOW - 3 * HOUR, NOW)).toBe("3 小时前");
  });

  it("天级显示「N 天前」", () => {
    expect(formatRelativeTime(NOW - 5 * DAY, NOW)).toBe("5 天前");
  });

  it("超过 30 天回退绝对日期", () => {
    const result = formatRelativeTime(NOW - 40 * DAY, NOW);
    expect(result).not.toContain("前");
    expect(result).not.toBe("刚刚");
  });

  it("未来时间戳（时钟偏差）兜底为「刚刚」", () => {
    expect(formatRelativeTime(NOW + 5 * SEC, NOW)).toBe("刚刚");
  });
});
