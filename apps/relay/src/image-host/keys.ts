export function sanitizeObjectKey(name: string): string {
  return name
    .replace(/[/\\]/g, "_")
    .replace(/%2f|%5c/gi, "_")
    .replace(/\.\./g, "_");
}
