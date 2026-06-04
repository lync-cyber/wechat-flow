import { z } from "zod";

export const versionTripleSchema = z.object({
  coreVersion: z.string(),
  themeVersion: z.string(),
  rulesetVersion: z.string(),
});

export type VersionTriple = z.infer<typeof versionTripleSchema>;
