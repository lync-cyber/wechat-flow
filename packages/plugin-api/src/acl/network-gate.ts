export type NetworkPermission = string[];

/** URL pattern whitelist check for plugin network access. */
export function checkNetworkAccess(url: string, allowedPatterns: NetworkPermission): boolean {
  if (!url) return false;
  for (const pattern of allowedPatterns) {
    if (!pattern) continue;
    if (pattern.endsWith("*")) {
      const prefix = pattern.slice(0, -1);
      if (url.startsWith(prefix)) return true;
    } else if (url === pattern) {
      return true;
    }
  }
  return false;
}
