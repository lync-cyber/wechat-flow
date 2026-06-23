import piexifjs from "piexifjs";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { preprocessImage } from "../../apps/relay/src/image/preprocess.ts";

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

/**
 * Build a JPEG buffer with a GPS EXIF IFD written in.
 * Uses piexifjs: binary-string ↔ Buffer conversions as required by the library.
 * The fixture image is 1600×1200 to ensure raw size ≥ 500 KB at quality 95.
 */
async function buildJpegWithGpsExif(): Promise<Uint8Array> {
  const rawBuffer = await sharp({
    create: {
      width: 1600,
      height: 1200,
      channels: 3,
      background: { r: 100, g: 150, b: 200 },
    },
  })
    .jpeg({ quality: 95 })
    .toBuffer();

  // piexifjs operates on binary strings
  const binaryStr = rawBuffer.toString("binary");

  const exifObj = {
    "0th": {},
    Exif: {},
    GPS: {
      [piexifjs.GPSIFD.GPSLatitudeRef]: "N",
      [piexifjs.GPSIFD.GPSLatitude]: [
        [37, 1],
        [46, 1],
        [29, 1],
      ],
      [piexifjs.GPSIFD.GPSLongitudeRef]: "W",
      [piexifjs.GPSIFD.GPSLongitude]: [
        [122, 1],
        [25, 1],
        [10, 1],
      ],
    },
  };

  const exifBytes = piexifjs.dump(exifObj);
  const insertedBinaryStr = piexifjs.insert(exifBytes, binaryStr);
  return Buffer.from(insertedBinaryStr, "binary");
}

/**
 * Build a JPEG buffer with width 2000px (to test resize-down).
 */
async function buildWideJpeg(): Promise<Uint8Array> {
  return sharp({
    create: {
      width: 2000,
      height: 1000,
      channels: 3,
      background: { r: 200, g: 180, b: 160 },
    },
  })
    .jpeg({ quality: 80 })
    .toBuffer();
}

// ---------------------------------------------------------------------------
// AC-001: EXIF stripping + size reduction
// ---------------------------------------------------------------------------

describe("AC-001: preprocessImage strips GPS EXIF and reduces file size", () => {
  it("output byte size is smaller than input size when processing a large JPEG with GPS EXIF", async () => {
    const input = await buildJpegWithGpsExif();
    const inputSize = input.byteLength;

    const result = await preprocessImage(input);

    expect(result.size).toBeLessThan(inputSize);
  });

  it("GPS IFD is absent from the output (piexifjs GPS object is empty after processing)", async () => {
    const input = await buildJpegWithGpsExif();

    const result = await preprocessImage(input);

    // piexifjs requires binary string input
    const outputBinaryStr = Buffer.from(result.data).toString("binary");
    const exifObj = piexifjs.load(outputBinaryStr);

    // GPS IFD must be an empty object — no keys at all
    expect(Object.keys(exifObj.GPS ?? {})).toHaveLength(0);
  });

  it("input fixture has GPS EXIF before processing (validates fixture construction)", async () => {
    const input = await buildJpegWithGpsExif();
    const binaryStr = Buffer.from(input).toString("binary");
    const exifObj = piexifjs.load(binaryStr);

    // Fixture must contain lat/lon keys to prove the test is meaningful
    expect(Object.keys(exifObj.GPS ?? {}).length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// AC-002: Width resize — ≤ 1080px; no upscaling for small images
// ---------------------------------------------------------------------------

describe("AC-002: preprocessImage resizes to ≤ 1080px width", () => {
  it("output width is ≤ 1080 when input is 2000px wide", async () => {
    const input = await buildWideJpeg();

    const result = await preprocessImage(input);

    expect(result.width).toBeLessThanOrEqual(1080);
  });

  it("output width from sharp metadata matches result.width field", async () => {
    const input = await buildWideJpeg();

    const result = await preprocessImage(input);

    const meta = await sharp(result.data).metadata();
    expect(meta.width).toBe(result.width);
  });

  it("small image (width < 1080) is not upscaled — width stays original", async () => {
    const smallInput = await sharp({
      create: {
        width: 400,
        height: 300,
        channels: 3,
        background: { r: 50, g: 100, b: 150 },
      },
    })
      .jpeg({ quality: 80 })
      .toBuffer();

    const result = await preprocessImage(smallInput, { maxWidth: 1080 });

    expect(result.width).toBe(400);
  });

  it("result.size equals result.data.byteLength", async () => {
    const input = await buildWideJpeg();

    const result = await preprocessImage(input);

    expect(result.size).toBe(result.data.byteLength);
  });

  it("result.format is a non-empty string identifying the output format", async () => {
    const input = await buildWideJpeg();

    const result = await preprocessImage(input);

    expect(result.format.length).toBeGreaterThan(0);
    // The output format must be a recognised image format identifier
    expect(["jpeg", "png", "webp", "avif"]).toContain(result.format);
  });
});
