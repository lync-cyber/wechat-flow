import sharp from "sharp";

export interface PreprocessOptions {
  maxWidth?: number;
}

export interface PreprocessResult {
  data: Uint8Array;
  width: number;
  height: number;
  size: number;
  format: string;
}

export async function preprocessImage(
  input: Uint8Array,
  opts?: PreprocessOptions
): Promise<PreprocessResult> {
  const maxWidth = opts?.maxWidth ?? 1080;

  const { data, info } = await sharp(input)
    .rotate()
    .resize({ width: maxWidth, withoutEnlargement: true })
    .toBuffer({ resolveWithObject: true });

  return {
    data: new Uint8Array(data),
    width: info.width,
    height: info.height,
    size: data.length,
    format: info.format,
  };
}
