export interface AuditEntry {
  allow: boolean;
  url: string;
  pluginId: string;
  ts: number;
}

/** In-memory audit log for plugin network access decisions. */
export class AuditLog {
  private entries: AuditEntry[] = [];

  record(entry: AuditEntry): void {
    this.entries.push(entry);
  }

  getEntries(): AuditEntry[] {
    return this.entries;
  }
}
