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
// AC-001 (cross-format): EXIF stripping for WebP and PNG inputs
// ---------------------------------------------------------------------------

async function buildImageWithExif(format: "webp" | "png"): Promise<Uint8Array> {
  const pipeline = sharp({
    create: { width: 1200, height: 800, channels: 3, background: { r: 10, g: 20, b: 30 } },
  }).withExif({ IFD0: { ImageDescription: "wf-exif-marker" } });
  const buf =
    format === "webp" ? await pipeline.webp().toBuffer() : await pipeline.png().toBuffer();
  return Uint8Array.from(buf);
}

describe("AC-001 (cross-format): preprocessImage strips EXIF from WebP and PNG inputs", () => {
  for (const format of ["webp", "png"] as const) {
    it(`${format} input carrying EXIF has no EXIF metadata after processing`, async () => {
      const input = await buildImageWithExif(format);

      // Fixture validity: the input must actually carry EXIF for the test to be meaningful
      const inputMeta = await sharp(input).metadata();
      expect(inputMeta.exif).toBeDefined();

      const result = await preprocessImage(input);

      const outputMeta = await sharp(result.data).metadata();
      expect(outputMeta.exif).toBeUndefined();
    });
  }
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

// ---------------------------------------------------------------------------
// Fixture helpers for AC-002~004.
//
// jpeg/webp: fully random (uniformly distributed) raw pixel buffers are
// incompressible by DCT prediction, so a 1080-wide × 2200-tall render
// comfortably exceeds the 2.5MB target even after resize clamps width to
// 1080 (height passes through unchanged) — this forces the quality ladder
// to run through to its lowest rungs without ever reaching the target,
// which is exactly the AC-002/AC-004 scenario under test.
//
// png: DEFLATE (used by PNG) *does* exploit spatial redundancy, so a
// square gaussian-noise render at moderate sigma exceeds 2.5MB uncompressed
// but responds to compressionLevel 9 and/or width step-down — matching the
// AC-003 "params first, then step down" scenario where the target is
// actually reachable.
// ---------------------------------------------------------------------------

const TARGET_BYTES = 2.5 * 1024 * 1024;

function randomRawBuffer(width: number, height: number, channels: 3 | 4): Buffer {
  const buf = Buffer.alloc(width * height * channels);
  for (let i = 0; i < buf.length; i++) {
    buf[i] = Math.floor(Math.random() * 256);
  }
  return buf;
}

async function buildNoisyJpeg(width = 1080, height = 2200): Promise<Uint8Array> {
  const raw = randomRawBuffer(width, height, 3);
  const buf = await sharp(raw, { raw: { width, height, channels: 3 } })
    .jpeg({ quality: 100 })
    .toBuffer();
  return Uint8Array.from(buf);
}

async function buildNoisyWebp(width = 1080, height = 2200): Promise<Uint8Array> {
  const raw = randomRawBuffer(width, height, 3);
  const buf = await sharp(raw, { raw: { width, height, channels: 3 } })
    .webp({ quality: 100, lossless: false })
    .toBuffer();
  return Uint8Array.from(buf);
}

async function buildNoisyPng(width = 1080, height = 1080): Promise<Uint8Array> {
  const buf = await sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 128, g: 128, b: 128, alpha: 1 },
      noise: { type: "gaussian", mean: 128, sigma: 20 },
    },
  })
    .png({ compressionLevel: 0, palette: false })
    .toBuffer();
  return Uint8Array.from(buf);
}

// ---------------------------------------------------------------------------
// AC-002: jpeg/webp quality-ladder recompression when resize output > 2.5MB
// ---------------------------------------------------------------------------

describe("AC-002: preprocessImage applies quality-ladder recompression for oversized jpeg/webp", () => {
  it("jpeg input that resizes to > 2.5MB is recompressed to ≤ 2.5MB", async () => {
    const input = await buildNoisyJpeg();
    const preSize = (
      await sharp(input)
        .resize({ width: 1080, withoutEnlargement: true })
        .jpeg({ quality: 100 })
        .toBuffer()
    ).byteLength;
    expect(preSize).toBeGreaterThan(TARGET_BYTES);

    const result = await preprocessImage(input);

    expect(result.size).toBeLessThanOrEqual(TARGET_BYTES);
    expect(result.size).toBe(result.data.byteLength);
  });

  it("jpeg recompression preserves format as jpeg and does not upscale width", async () => {
    const input = await buildNoisyJpeg();

    const result = await preprocessImage(input);

    expect(result.format).toBe("jpeg");
    expect(result.width).toBeLessThanOrEqual(1080);
  });

  it("webp input that resizes to > 2.5MB is recompressed to ≤ 2.5MB and keeps webp format", async () => {
    const input = await buildNoisyWebp(1080, 2800);
    const preSize = (
      await sharp(input)
        .resize({ width: 1080, withoutEnlargement: true })
        .webp({ quality: 100 })
        .toBuffer()
    ).byteLength;
    expect(preSize).toBeGreaterThan(TARGET_BYTES);

    const result = await preprocessImage(input);

    expect(result.size).toBeLessThanOrEqual(TARGET_BYTES);
    expect(result.format).toBe("webp");
  });

  it("custom targetBytes option is honored for jpeg recompression", async () => {
    const input = await buildNoisyJpeg();
    const customTarget = 1 * 1024 * 1024;

    const result = await preprocessImage(input, { targetBytes: customTarget });

    expect(result.size).toBeLessThanOrEqual(customTarget);
  });
});

// ---------------------------------------------------------------------------
// AC-003: png path — compression params first, then width step-down; no
// conversion to jpeg (alpha channel must survive).
// ---------------------------------------------------------------------------

describe("AC-003: preprocessImage compresses oversized png via params then width step-down", () => {
  it("png input that resizes to > 2.5MB is brought to ≤ 2.5MB while remaining png", async () => {
    const input = await buildNoisyPng();
    const preSize = (
      await sharp(input)
        .resize({ width: 1080, withoutEnlargement: true })
        .png({ compressionLevel: 0, palette: false })
        .toBuffer()
    ).byteLength;
    expect(preSize).toBeGreaterThan(TARGET_BYTES);

    const result = await preprocessImage(input);

    expect(result.size).toBeLessThanOrEqual(TARGET_BYTES);
    expect(result.format).toBe("png");
  });

  it("png alpha channel survives compression (not converted to jpeg)", async () => {
    const input = await buildNoisyPng();

    const result = await preprocessImage(input);

    const meta = await sharp(result.data).metadata();
    expect(meta.format).toBe("png");
    expect(meta.hasAlpha).toBe(true);
  });

  it("png width step-down does not go below the 640px floor", async () => {
    const input = await buildNoisyPng(1080, 1080);

    const result = await preprocessImage(input);

    expect(result.width).toBeGreaterThanOrEqual(640);
  });
});

// ---------------------------------------------------------------------------
// AC-004: best-effort bottoming-out semantics — never throws, returns the
// last best attempt even when target is unreachable.
// ---------------------------------------------------------------------------

describe("AC-004: preprocessImage never throws and returns best-effort result when target is unreachable", () => {
  it("extreme noisy png that cannot reach 2.5MB even at the width floor does not throw", async () => {
    const input = await buildNoisyPng(1080, 1080);

    await expect(preprocessImage(input, { targetBytes: 1 })).resolves.toBeDefined();
  });

  it("best-effort result for an unreachable target still respects the 640px width floor", async () => {
    const input = await buildNoisyPng(1080, 1080);

    const result = await preprocessImage(input, { targetBytes: 1 });

    expect(result.width).toBeGreaterThanOrEqual(640);
    expect(result.format).toBe("png");
  });

  it("extreme noisy jpeg that cannot reach an unreachable target does not throw and stays jpeg", async () => {
    const input = await buildNoisyJpeg();

    const result = await preprocessImage(input, { targetBytes: 1 });

    expect(result.format).toBe("jpeg");
    expect(result.size).toBe(result.data.byteLength);
  });
});
