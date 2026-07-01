import type { VersionTriple } from "@wechat-flow/contracts";
import { rulesetVersion } from "@wechat-flow/ruleset";
import pkg from "../../package.json" with { type: "json" };

export const coreVersion: string = pkg.version;

export function getVersionTriple(themeVersion = "0.0.0"): VersionTriple {
  return { coreVersion, themeVersion, rulesetVersion };
}
