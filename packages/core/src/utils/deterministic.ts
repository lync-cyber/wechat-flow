export function sortedKeys<T extends object>(obj: T): Array<keyof T> {
  return (Object.keys(obj) as Array<keyof T>).sort((a, b) => String(a).localeCompare(String(b)));
}

export function sortedEntries<V>(obj: Record<string, V>): Array<[string, V]> {
  return Object.entries(obj).sort(([a], [b]) => a.localeCompare(b));
}

export function sortedSet<T extends string | number>(set: Set<T>): T[] {
  return Array.from(set).sort((a, b) => String(a).localeCompare(String(b)));
}

export function canonicalStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalStringify).join(",")}]`;
  }
  const keys = Object.keys(value as Record<string, unknown>).sort((a, b) => a.localeCompare(b));
  const pairs = keys.map(
    (k) => `${JSON.stringify(k)}:${canonicalStringify((value as Record<string, unknown>)[k])}`
  );
  return `{${pairs.join(",")}}`;
}
