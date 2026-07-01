export interface DeprecationRecord {
  toolName: string;
  field: string;
  since: string;
  until: string;
}

export interface DeprecationWarning extends DeprecationRecord {
  expired: boolean;
}

const registry = new Map<string, DeprecationRecord>();

export function markDeprecated(
  toolName: string,
  field: string,
  since: string,
  until: string
): void {
  registry.set(`${toolName}:${field}`, { toolName, field, since, until });
}

export function checkDeprecations(now: Date = new Date()): DeprecationWarning[] {
  return [...registry.values()].map((r) => ({
    ...r,
    expired: now.getTime() > new Date(r.until).getTime(),
  }));
}

export function clearDeprecations(): void {
  registry.clear();
}
