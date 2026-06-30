export const PIXELMATCH_OPTIONS = {
  threshold: 0.2,
  includeAA: false,
} as const;

export const DIFF_RATIO_THRESHOLD = 0.05;

export function evaluateDiff({
  totalPixels,
  diffPixels,
}: {
  totalPixels: number;
  diffPixels: number;
}): { passed: boolean; ratio: number } {
  const ratio = diffPixels / totalPixels;
  return { passed: ratio <= DIFF_RATIO_THRESHOLD, ratio };
}
