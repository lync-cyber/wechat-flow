export type NetworkPermission = string[];

/** Returns true only if `url[idx]` is a safe path/query/fragment boundary or end-of-string. */
function isBoundary(url: string, idx: number): boolean {
  if (idx >= url.length) return true;
  const ch = url[idx];
  return ch === "/" || ch === "?" || ch === "#";
}

/**
 * Matches a subdomain wildcard pattern like `https://*.example.com/*`.
 * The `*` stands for exactly one subdomain label (no dots).
 */
function matchSubdomainPattern(url: string, pattern: string): boolean {
  // pattern example: "https://*.example.com/*"
  // Split at "://*." to get scheme and the rest
  const splitIdx = pattern.indexOf("://");
  if (splitIdx === -1) return false;
  const scheme = pattern.slice(0, splitIdx + 3); // "https://"
  const afterScheme = pattern.slice(scheme.length); // "*.example.com/*"

  if (!afterScheme.startsWith("*.")) return false;
  const hostPattern = afterScheme.slice(2); // "example.com/*"

  // Split host pattern at first "/" to get fixed host suffix and path pattern
  const slashIdx = hostPattern.indexOf("/");
  const fixedHost = slashIdx === -1 ? hostPattern : hostPattern.slice(0, slashIdx); // "example.com"

  if (!url.startsWith(scheme)) return false;
  const urlAfterScheme = url.slice(scheme.length); // "api.example.com/data"

  // urlAfterScheme must be: <subdomain>.<fixedHost><path>
  const expectedHostSuffix = `.${fixedHost}`; // ".example.com"
  const dotIdx = urlAfterScheme.indexOf(expectedHostSuffix);
  if (dotIdx <= 0) return false; // subdomain must be non-empty

  const subdomain = urlAfterScheme.slice(0, dotIdx);
  // Subdomain must be a single label (no dots, no slashes)
  if (subdomain.includes(".") || subdomain.includes("/")) return false;

  // What follows the fixed host must start with "/" (or end string) — host boundary
  const afterHost = urlAfterScheme.slice(dotIdx + expectedHostSuffix.length);
  if (
    afterHost.length > 0 &&
    afterHost[0] !== "/" &&
    afterHost[0] !== "?" &&
    afterHost[0] !== "#"
  ) {
    return false;
  }

  return true;
}

/** URL pattern whitelist check for plugin network access. */
export function checkNetworkAccess(url: string, allowedPatterns: NetworkPermission): boolean {
  if (!url) return false;
  for (const pattern of allowedPatterns) {
    if (!pattern) continue;

    if (pattern.endsWith("*")) {
      const prefix = pattern.slice(0, -1);

      // Subdomain wildcard: https://*.example.com/*
      if (prefix.includes("://*.")) {
        if (matchSubdomainPattern(url, pattern)) return true;
        continue;
      }

      // Standard prefix wildcard
      if (!url.startsWith(prefix)) continue;

      // If prefix ends with a path separator, the match is unconditionally valid
      if (prefix.endsWith("/") || prefix.endsWith("?") || prefix.endsWith("#")) {
        return true;
      }
      // Otherwise enforce host-boundary: next URL character must be a boundary
      if (isBoundary(url, prefix.length)) {
        return true;
      }
    } else if (url === pattern) {
      return true;
    }
  }
  return false;
}
