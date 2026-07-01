import { describe, expect, it } from "vitest";
import { EXPECTED_HASHES, FIXTURES, computeFixtureHashes } from "./fixtures.ts";

describe("cross-runtime: Node.js target", () => {
  it("renders every fixture to the golden SHA-256", async () => {
    const hashes = await computeFixtureHashes();
    expect(hashes).toEqual(EXPECTED_HASHES);
  });

  it("is deterministic across repeated renders", async () => {
    const first = await computeFixtureHashes();
    const second = await computeFixtureHashes();
    expect(first).toEqual(second);
  });

  it("covers CJK, block-directive, and frontmatter fixtures", () => {
    const names = FIXTURES.map((fixture) => fixture.name);
    expect(names).toContain("cjk-heading");
    expect(names).toContain("block-directive");
    expect(names).toContain("frontmatter");
    expect(FIXTURES.length).toBeGreaterThanOrEqual(3);
  });
});
