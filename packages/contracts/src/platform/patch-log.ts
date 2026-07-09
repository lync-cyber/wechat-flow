export interface PatchChange {
  patch: string;
  label?: string;
  count: number;
  samples: { selector?: string; before: string }[];
}

export interface PatchLog {
  patchedHtml: string;
  changes: PatchChange[];
}
