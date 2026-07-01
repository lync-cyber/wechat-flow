import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { computeFixtureHashes } from "../tests/cross-runtime/fixtures.ts";

const hashes = await computeFixtureHashes();
const fixturesPath = fileURLToPath(new URL("../tests/cross-runtime/fixtures.ts", import.meta.url));
const source = readFileSync(fixturesPath, "utf8");
const block = `export const EXPECTED_HASHES: Record<string, string> = ${JSON.stringify(hashes, null, 2)};\n`;
const next = source.replace(/export const EXPECTED_HASHES[\s\S]*?};\n/, block);
writeFileSync(fixturesPath, next);
console.log(JSON.stringify(hashes, null, 2));
