import sharp from "sharp";

export interface PreprocessedImages {
  fullImage: Buffer;
  mrzCrop: Buffer;
  isWideSpread: boolean;
  isVerticalSpread: boolean;
  leftPage?: Buffer;
  rightPage?: Buffer;
  topPage?: Buffer;
  bottomPage?: Buffer;
}

/**
 * Preprocesses a passport image into optimized buffers for OCR:
 * 1. Full image optimized for Visual Inspection Zone (VIZ) text.
 * 2. Dedicated bottom region crop optimized specifically for the Machine Readable Zone (MRZ).
 * 3. Detects if the image is a dual-page spread (horizontal side-by-side or vertical booklet).
 */
export async function preprocessPassportImage(rawBuffer: Buffer): Promise<PreprocessedImages> {
  const metadata = await sharp(rawBuffer).metadata();
  const width = metadata.width || 1200;
  const height = metadata.height || 800;
  const isWideSpread = width / height > 1.35;
  const isVerticalSpread = height / width > 1.20;

  // 1. Full Image for VIZ:
  // Resize to max 1800px, auto-rotate if EXIF orientation exists, normalize contrast, gentle sharpen
  const fullImage = await sharp(rawBuffer)
    .rotate() // auto rotate based on EXIF
    .resize(1800, 1800, { fit: "inside", withoutEnlargement: true })
    .grayscale()
    .normalize()
    .sharpen({ sigma: 1.0, m1: 1.0, m2: 2.0 })
    .toBuffer();

  // 2. Dedicated MRZ Crop:
  // For a single biodata page, MRZ is in the bottom 24%.
  // For a vertical booklet spread (top = page 2, bottom = biodata page),
  // MRZ is in the bottom 15% of the total image (bottom ~30% of biodata page).
  const mrzTopRatio = isVerticalSpread ? 0.82 : 0.74;
  const mrzTop = Math.max(0, Math.round(height * mrzTopRatio));
  const mrzHeight = height - mrzTop;

  let mrzCrop: Buffer;
  try {
    mrzCrop = await sharp(rawBuffer)
      .rotate()
      .extract({ left: 0, top: mrzTop, width: width, height: mrzHeight })
      .resize(1800, null, { withoutEnlargement: false }) // ensure MRZ line is high-resolution
      .grayscale()
      .normalize()
      .sharpen({ sigma: 1.2, m1: 1.5, m2: 2.5 })
      .toBuffer();
  } catch (err) {
    // Fallback if crop failed
    mrzCrop = fullImage;
  }

  // 3. Horizontal Dual Page Spread handling (Page 1 + Page 2 side-by-side)
  let leftPage: Buffer | undefined;
  let rightPage: Buffer | undefined;

  if (isWideSpread) {
    try {
      const halfWidth = Math.round(width / 2);
      leftPage = await sharp(rawBuffer)
        .rotate()
        .extract({ left: 0, top: 0, width: halfWidth, height: height })
        .resize(1600, 1600, { fit: "inside", withoutEnlargement: true })
        .grayscale()
        .normalize()
        .toBuffer();

      rightPage = await sharp(rawBuffer)
        .rotate()
        .extract({ left: halfWidth, top: 0, width: width - halfWidth, height: height })
        .resize(1600, 1600, { fit: "inside", withoutEnlargement: true })
        .grayscale()
        .normalize()
        .toBuffer();
    } catch {}
  }

  // 4. Vertical Dual Page Spread handling (Page 2 on top, Biodata on bottom)
  let topPage: Buffer | undefined;
  let bottomPage: Buffer | undefined;

  if (isVerticalSpread) {
    try {
      const halfHeight = Math.round(height / 2);
      topPage = await sharp(rawBuffer)
        .rotate()
        .extract({ left: 0, top: 0, width: width, height: halfHeight })
        .resize(1600, 1600, { fit: "inside", withoutEnlargement: true })
        .grayscale()
        .normalize()
        .toBuffer();

      bottomPage = await sharp(rawBuffer)
        .rotate()
        .extract({ left: 0, top: halfHeight, width: width, height: height - halfHeight })
        .resize(1600, 1600, { fit: "inside", withoutEnlargement: true })
        .grayscale()
        .normalize()
        .toBuffer();
    } catch {}
  }

  return {
    fullImage,
    mrzCrop,
    isWideSpread,
    isVerticalSpread,
    leftPage,
    rightPage,
    topPage,
    bottomPage,
  };
}
