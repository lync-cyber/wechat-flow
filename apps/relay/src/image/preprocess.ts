import sharp from "sharp";

export interface PreprocessOptions {
  maxWidth?: number;
  targetBytes?: number;
}

export interface PreprocessResult {
  data: Uint8Array;
  width: number;
  height: number;
  size: number;
  format: string;
}

const DEFAULT_TARGET_BYTES = 2.5 * 1024 * 1024;
const JPEG_WEBP_QUALITY_LADDER = [80, 70, 60, 50];
const PNG_WIDTH_STEP_FACTOR = 0.8;
const PNG_WIDTH_FLOOR = 640;
const PNG_WIDTH_STEP_MAX_ITERATIONS = 20;

type SharpPipeline = ReturnType<typeof sharp>;

function toBufferWithInfo(pipeline: SharpPipeline) {
  return pipeline.toBuffer({ resolveWithObject: true });
}

type EncodedAttempt = Awaited<ReturnType<typeof toBufferWithInfo>>;

async function encodeJpeg(pipeline: SharpPipeline, quality: number): Promise<EncodedAttempt> {
  return toBufferWithInfo(pipeline.clone().jpeg({ quality }));
}

async function encodeWebp(pipeline: SharpPipeline, quality: number): Promise<EncodedAttempt> {
  return toBufferWithInfo(pipeline.clone().webp({ quality }));
}

async function recompressQualityLadder(
  pipeline: SharpPipeline,
  format: "jpeg" | "webp",
  targetBytes: number,
  initial: EncodedAttempt
): Promise<EncodedAttempt> {
  let best = initial;
  for (const quality of JPEG_WEBP_QUALITY_LADDER) {
    const attempt =
      format === "jpeg" ? await encodeJpeg(pipeline, quality) : await encodeWebp(pipeline, quality);
    if (attempt.data.length < best.data.length) {
      best = attempt;
    }
    if (attempt.data.length <= targetBytes) {
      return attempt;
    }
  }
  return best;
}

async function encodePng(
  pipeline: SharpPipeline,
  compressionLevel: number
): Promise<EncodedAttempt> {
  return toBufferWithInfo(pipeline.clone().png({ compressionLevel, palette: false }));
}

async function recompressPng(
  input: Uint8Array,
  maxWidth: number,
  targetBytes: number,
  initial: EncodedAttempt
): Promise<EncodedAttempt> {
  let best = initial;

  const paramsAttempt = await encodePng(
    sharp(input).rotate().resize({ width: maxWidth, withoutEnlargement: true }),
    9
  );
  if (paramsAttempt.data.length < best.data.length) {
    best = paramsAttempt;
  }
  if (paramsAttempt.data.length <= targetBytes) {
    return paramsAttempt;
  }

  let width = Math.min(maxWidth, best.info.width);
  for (let i = 0; i < PNG_WIDTH_STEP_MAX_ITERATIONS && width > PNG_WIDTH_FLOOR; i++) {
    width = Math.max(PNG_WIDTH_FLOOR, Math.floor(width * PNG_WIDTH_STEP_FACTOR));
    const attempt = await encodePng(
      sharp(input).rotate().resize({ width, withoutEnlargement: true }),
      9
    );
    if (attempt.data.length < best.data.length) {
      best = attempt;
    }
    if (attempt.data.length <= targetBytes) {
      return attempt;
    }
  }

  return best;
}

export async function preprocessImage(
  input: Uint8Array,
  opts?: PreprocessOptions
): Promise<PreprocessResult> {
  const maxWidth = opts?.maxWidth ?? 1080;
  const targetBytes = opts?.targetBytes ?? DEFAULT_TARGET_BYTES;

  const base = sharp(input).rotate().resize({ width: maxWidth, withoutEnlargement: true });
  const initial = await toBufferWithInfo(base.clone());

  let best = initial;

  if (initial.data.length > targetBytes) {
    if (initial.info.format === "jpeg" || initial.info.format === "webp") {
      best = await recompressQualityLadder(base, initial.info.format, targetBytes, initial);
    } else if (initial.info.format === "png") {
      best = await recompressPng(input, maxWidth, targetBytes, initial);
    }
  }

  return {
    data: new Uint8Array(best.data),
    width: best.info.width,
    height: best.info.height,
    size: best.data.length,
    format: best.info.format,
  };
}
