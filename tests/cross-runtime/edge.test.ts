import { describe, expect, it } from "vitest";
import { EXPECTED_HASHES, computeFixtureHashes } from "./fixtures.ts";

describe("cross-runtime: Edge Runtime (workerd) target", () => {
  it("renders every fixture to the golden SHA-256 in Miniflare", async () => {
    const hashes = await computeFixtureHashes();
    expect(hashes).toEqual(EXPECTED_HASHES);
  });
});
