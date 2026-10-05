import { DetectedFace, AspectRatioPreset } from '../types/passport';

/**
 * Detects the primary face in an image using either the browser's
 * native Shape Detection API (if supported) or a robust client-side
 * skin-chroma & facial-morphology locator.
 */
export async function detectPrimaryFace(
  img: HTMLImageElement
): Promise<DetectedFace | null> {
  // 1. Try native browser FaceDetector API if available (Chrome/Edge with Shape Detection)
  if (typeof window !== 'undefined' && 'FaceDetector' in window) {
    try {
      const FaceDetectorConstructor = (window as any).FaceDetector;
      const detector = new FaceDetectorConstructor({
        maxDetectedFaces: 1,
        fastMode: false,
      });

      const faces = await detector.detect(img);
      if (faces && faces.length > 0) {
        const primary = faces[0].boundingBox;
        if (primary && primary.width > 20 && primary.height > 20) {
          return {
            x: Math.round(primary.x),
            y: Math.round(primary.y),
            width: Math.round(primary.width),
            height: Math.round(primary.height),
            eyeY: Math.round(primary.y + primary.height * 0.38),
            confidence: 0.94,
            source: 'native-shape-detector',
          };
        }
      }
    } catch (err) {
      console.warn('Native FaceDetector error, falling back to algorithmic detection:', err);
    }
  }

  // 2. Client-side Algorithmic Face & Feature Locator
  return detectFaceAlgorithmic(img);
}

/**
 * Pure client-side face localization based on Chai-Ngan YCbCr/HSV skin locus,
 * facial proportion geometry, and horizontal eye-contrast valley detection.
 */
function detectFaceAlgorithmic(img: HTMLImageElement): DetectedFace | null {
  const origW = img.naturalWidth || img.width;
  const origH = img.naturalHeight || img.height;

  if (origW < 50 || origH < 50) return null;

  // Downsample to ~240px wide for high speed and noise reduction
  const sampleW = 240;
  const sampleH = Math.round((origH * sampleW) / origW);

  const canvas = document.createElement('canvas');
  canvas.width = sampleW;
  canvas.height = sampleH;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;

  ctx.drawImage(img, 0, 0, sampleW, sampleH);
  let imgData: ImageData;
  try {
    imgData = ctx.getImageData(0, 0, sampleW, sampleH);
  } catch (e) {
    return null;
  }

  const { data } = imgData;

  // Build binary skin mask
  const skinMask = new Uint8Array(sampleW * sampleH);
  const skinXSum = new Int32Array(sampleW);
  const skinYSum = new Int32Array(sampleH);

  let totalSkinPixels = 0;

  for (let y = 0; y < sampleH; y++) {
    // Passport faces are usually centered and in upper 15% - 85% of image
    const yWeight = y > sampleH * 0.12 && y < sampleH * 0.85 ? 1 : 0.3;

    for (let x = 0; x < sampleW; x++) {
      const idx = (y * sampleW + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      // YCbCr skin model
      const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
      const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;

      // Human skin chromaticity cluster
      const isSkin =
        cb >= 77 &&
        cb <= 127 &&
        cr >= 133 &&
        cr <= 173 &&
        r > g &&
        g > b &&
        r - g >= 15;

      if (isSkin) {
        skinMask[y * sampleW + x] = 1;
        skinXSum[x] += Math.round(yWeight * 10);
        skinYSum[y] += 1;
        totalSkinPixels++;
      }
    }
  }

  // If skin pixel count is too low, no face detected
  if (totalSkinPixels < (sampleW * sampleH) * 0.015) {
    return null;
  }

  // Find dominant X center of skin cluster
  let maxWeightX = 0;
  let bestCenterX = Math.round(sampleW / 2);
  const windowRadiusX = Math.round(sampleW * 0.18);

  for (let x = windowRadiusX; x < sampleW - windowRadiusX; x++) {
    let windowSum = 0;
    for (let dx = -windowRadiusX; dx <= windowRadiusX; dx++) {
      windowSum += skinXSum[x + dx];
    }
    if (windowSum > maxWeightX) {
      maxWeightX = windowSum;
      bestCenterX = x;
    }
  }

  // Find vertical boundaries of the head
  let headTopY = -1;
  let headBottomY = -1;
  const rowThreshold = sampleW * 0.05;

  for (let y = Math.round(sampleH * 0.1); y < Math.round(sampleH * 0.85); y++) {
    if (skinYSum[y] > rowThreshold && headTopY === -1) {
      headTopY = y;
    }
    if (skinYSum[y] > rowThreshold) {
      headBottomY = y;
    }
  }

  if (headTopY === -1 || headBottomY === -1 || headBottomY - headTopY < sampleH * 0.15) {
    // Fallback: estimate centered face in upper half
    headTopY = Math.round(sampleH * 0.2);
    headBottomY = Math.round(sampleH * 0.65);
  }

  const faceSampleH = headBottomY - headTopY;
  // Natural human facial aspect ratio width / height ~ 0.75 - 0.85
  const faceSampleW = Math.round(faceSampleH * 0.78);
  const faceSampleX = Math.max(0, Math.round(bestCenterX - faceSampleW / 2));
  const faceSampleY = headTopY;

  // Search for the eye valley (horizontal contrast stripe across upper 35-45% of face)
  let eyeSampleY = Math.round(faceSampleY + faceSampleH * 0.38);
  let minRowBrightness = Infinity;

  const eyeSearchStart = Math.round(faceSampleY + faceSampleH * 0.25);
  const eyeSearchEnd = Math.round(faceSampleY + faceSampleH * 0.5);

  for (let y = eyeSearchStart; y <= eyeSearchEnd; y++) {
    let rowLum = 0;
    let count = 0;
    for (let x = faceSampleX; x < faceSampleX + faceSampleW; x++) {
      if (x >= 0 && x < sampleW && y >= 0 && y < sampleH) {
        const idx = (y * sampleW + x) * 4;
        // relative luminance
        const lum = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
        rowLum += lum;
        count++;
      }
    }
    if (count > 0) {
      const avgLum = rowLum / count;
      if (avgLum < minRowBrightness) {
        minRowBrightness = avgLum;
        eyeSampleY = y;
      }
    }
  }

  // Scale back to original image coordinates
  const scale = origW / sampleW;

  return {
    x: Math.round(faceSampleX * scale),
    y: Math.round(faceSampleY * scale),
    width: Math.round(faceSampleW * scale),
    height: Math.round(faceSampleH * scale),
    eyeY: Math.round(eyeSampleY * scale),
    confidence: 0.85,
    source: 'algorithmic-feature-locator',
  };
}

/**
 * Calculates the ideal crop parameters (zoom and pan) so the detected face
 * meets biometric passport standards (crown to chin ~70-75%, eyes at ~42% from top, centered).
 */
export function calculatePassportAutoCrop(params: {
  face: DetectedFace;
  imageWidth: number;
  imageHeight: number;
  frameWidth: number;
  frameHeight: number;
  baseScale: number;
  aspectPreset: AspectRatioPreset;
}): { zoom: number; pan: { x: number; y: number } } {
  const {
    face,
    imageWidth,
    imageHeight,
    frameWidth,
    frameHeight,
    baseScale,
  } = params;

  // Target: face height should occupy ~60-64% of passport crop frame height
  // (leaving room above head for crown of hair, and below chin for collar/neck)
  const targetCropHeightPx = face.height / 0.62;

  // In the UI, the crop frame has height frameHeight.
  // At zoom = 1, crop frame covers (frameHeight / baseScale) image pixels.
  // So required zoom is:
  let idealZoom = frameHeight / (targetCropHeightPx * baseScale);
  // Clamp zoom to safe range
  idealZoom = Math.min(3.2, Math.max(0.7, Math.round(idealZoom * 100) / 100));

  // Determine ideal center of passport photo in image pixels
  const faceCenterX = face.x + face.width / 2;

  // Eye level in image
  const eyeLevelY = face.eyeY !== undefined ? face.eyeY : face.y + face.height * 0.38;

  // In a compliant passport photo, eye line is at 42% from top (58% from bottom)
  // So: photoTopY = eyeLevelY - (targetCropHeightPx * 0.42)
  // photoCenterY = photoTopY + (targetCropHeightPx * 0.50) = eyeLevelY + targetCropHeightPx * 0.08
  const photoCenterY = eyeLevelY + targetCropHeightPx * 0.08;

  // Calculate pan needed to place (faceCenterX, photoCenterY) at the center of the crop frame
  // Image center in original pixels is (imageWidth / 2, imageHeight / 2)
  const panX = -Math.round((faceCenterX - imageWidth / 2) * baseScale * idealZoom);
  const panY = -Math.round((photoCenterY - imageHeight / 2) * baseScale * idealZoom);

  return {
    zoom: idealZoom,
    pan: { x: panX, y: panY },
  };
}
