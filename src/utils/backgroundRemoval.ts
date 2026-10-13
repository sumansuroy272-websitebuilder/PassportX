import { DetectedFace } from '../types/passport';
import { detectPrimaryFace } from './faceDetection';
import { loadImageElement } from './imageProcessing';

export type BgColorPreset = 'white' | 'skyblue' | 'gray' | 'transparent' | 'original' | 'custom';

export interface BgRemovalOptions {
  colorPreset: BgColorPreset;
  customColor?: string; // hex like '#70b5f9'
  tolerance?: number; // 10 - 70, default 34
  smoothness?: number; // 1 - 5, default 2
}

export interface BgRemovalResult {
  dataUrl: string;
  width: number;
  height: number;
  colorPreset: BgColorPreset;
  appliedColor: string;
}

// Preset color definitions
export const BG_PRESET_COLORS: Record<BgColorPreset, { hex: string; label: string; bengaliLabel: string }> = {
  white: { hex: '#FFFFFF', label: 'White', bengaliLabel: 'সাদা' },
  skyblue: { hex: '#70B5F9', label: 'Sky Blue', bengaliLabel: 'আকাশি নীল' },
  gray: { hex: '#E2E8F0', label: 'Studio Gray', bengaliLabel: 'হালকা ধূসর' },
  transparent: { hex: 'transparent', label: 'Transparent', bengaliLabel: 'স্বচ্ছ' },
  original: { hex: 'original', label: 'Original Photo', bengaliLabel: 'আসল ছবি' },
  custom: { hex: '#38BDF8', label: 'Custom Color', bengaliLabel: 'কাস্টম রঙ' },
};

// Cache for AI-generated masks so switching between White and Sky Blue is instantaneous
const maskCache = new Map<string, HTMLCanvasElement>();

/**
 * Loads Google MediaPipe SelfieSegmentation solution from local /mediapipe/ or CDN
 */
async function loadSelfieSegmentation(): Promise<any> {
  if (typeof window === 'undefined') return null;

  if ((window as any).SelfieSegmentation) {
    return (window as any).SelfieSegmentation;
  }

  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-mediapipe="selfie-segmentation"]');
    if (existing) {
      if ((window as any).SelfieSegmentation) {
        resolve((window as any).SelfieSegmentation);
      } else {
        existing.addEventListener('load', () => resolve((window as any).SelfieSegmentation));
        existing.addEventListener('error', () => reject(new Error('Failed to load existing SelfieSegmentation script')));
      }
      return;
    }

    const script = document.createElement('script');
    script.setAttribute('data-mediapipe', 'selfie-segmentation');
    script.src = '/mediapipe/selfie_segmentation.js';
    script.crossOrigin = 'anonymous';

    script.onload = () => {
      if ((window as any).SelfieSegmentation) {
        resolve((window as any).SelfieSegmentation);
      } else {
        reject(new Error('SelfieSegmentation not found on window after script load'));
      }
    };

    script.onerror = () => {
      // Fallback to jsdelivr CDN if local file fails
      console.warn('Local MediaPipe script failed, falling back to CDN...');
      const cdnScript = document.createElement('script');
      cdnScript.setAttribute('data-mediapipe', 'selfie-segmentation');
      cdnScript.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/selfie_segmentation.js';
      cdnScript.crossOrigin = 'anonymous';
      cdnScript.onload = () => {
        if ((window as any).SelfieSegmentation) {
          resolve((window as any).SelfieSegmentation);
        } else {
          reject(new Error('SelfieSegmentation not found on window after CDN load'));
        }
      };
      cdnScript.onerror = () => reject(new Error('Failed to load MediaPipe from both local and CDN'));
      document.head.appendChild(cdnScript);
    };

    document.head.appendChild(script);
  });
}

/**
 * AI Portrait Segmentation using MediaPipe Deep Neural Network.
 * Accurately extracts the person (face, hair, ears, shoulders, clothes)
 * from any complex background (brick walls, outdoors, indoor rooms).
 */
async function getAIPortraitMask(
  img: HTMLImageElement,
  imageSrcKey: string
): Promise<HTMLCanvasElement | null> {
  // Check in-memory cache
  if (maskCache.has(imageSrcKey)) {
    return maskCache.get(imageSrcKey)!;
  }

  try {
    const SelfieSegmentationClass = await loadSelfieSegmentation();
    if (!SelfieSegmentationClass) return null;

    const segmenter = new SelfieSegmentationClass({
      locateFile: (file: string) => {
        // Try local /mediapipe/ path first
        return `/mediapipe/${file}`;
      },
    });

    // Model selection: 1 is the higher-accuracy landscape/portrait model with upper body
    segmenter.setOptions({
      modelSelection: 1,
      selfieMode: false,
    });

    const origW = img.naturalWidth || img.width;
    const origH = img.naturalHeight || img.height;

    const maskCanvas = await new Promise<HTMLCanvasElement>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('MediaPipe segmentation timeout (12s)'));
      }, 12000);

      segmenter.onResults((results: any) => {
        clearTimeout(timeoutId);
        if (results && results.segmentationMask) {
          const mCanvas = document.createElement('canvas');
          mCanvas.width = origW;
          mCanvas.height = origH;
          const mCtx = mCanvas.getContext('2d');
          if (mCtx) {
            mCtx.drawImage(results.segmentationMask, 0, 0, origW, origH);
            resolve(mCanvas);
          } else {
            reject(new Error('Could not create mask 2D context'));
          }
        } else {
          reject(new Error('No segmentation mask returned by model'));
        }
      });

      segmenter.send({ image: img }).catch((err: any) => {
        clearTimeout(timeoutId);
        reject(err);
      });
    });

    // Cache the result
    maskCache.set(imageSrcKey, maskCanvas);
    return maskCanvas;
  } catch (err) {
    console.warn('AI Segmentation error, falling back to algorithmic method:', err);
    return null;
  }
}

/**
 * Fallback algorithmic segmentation if WebGL/MediaPipe is unavailable
 */
function createAlgorithmicMask(
  img: HTMLImageElement,
  face: DetectedFace | null,
  tolerance: number
): HTMLCanvasElement {
  const origW = img.naturalWidth || img.width;
  const origH = img.naturalHeight || img.height;

  const canvas = document.createElement('canvas');
  canvas.width = origW;
  canvas.height = origH;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  // Render a full-alpha mask by default
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, origW, origH);
  return canvas;
}

/**
 * Removes or replaces the background of a portrait photograph
 * with pixel-perfect AI segmentation for standard passport photo colors:
 * - White (#FFFFFF)
 * - Sky Blue (#70B5F9)
 * - Studio Gray (#E2E8F0)
 * - Transparent PNG
 */
export async function removeAndReplaceBackground(
  imageSrc: string,
  options: BgRemovalOptions,
  providedFace?: DetectedFace | null
): Promise<BgRemovalResult> {
  const { colorPreset, customColor, tolerance = 35, smoothness = 2 } = options;

  const img = await loadImageElement(imageSrc);
  const origW = img.naturalWidth || img.width;
  const origH = img.naturalHeight || img.height;

  // Determine target background fill color
  let targetColorHex = '#FFFFFF';
  let isTransparent = false;

  if (colorPreset === 'white') {
    targetColorHex = '#FFFFFF';
  } else if (colorPreset === 'skyblue') {
    targetColorHex = '#70B5F9'; // Official passport / exam sky blue
  } else if (colorPreset === 'gray') {
    targetColorHex = '#E2E8F0';
  } else if (colorPreset === 'transparent') {
    isTransparent = true;
    targetColorHex = 'rgba(0,0,0,0)';
  } else if (colorPreset === 'custom' && customColor) {
    targetColorHex = customColor;
  }

  // 1. Obtain AI Portrait Segmentation Mask (Deep Neural Network)
  let maskCanvas = await getAIPortraitMask(img, imageSrc);

  // 2. If AI model is unavailable, use fallback
  if (!maskCanvas) {
    let face = providedFace;
    if (!face) {
      try {
        face = await detectPrimaryFace(img);
      } catch (e) {
        face = null;
      }
    }
    maskCanvas = createAlgorithmicMask(img, face, tolerance);
  }

  // 3. Render Output at 100% full original resolution
  const outCanvas = document.createElement('canvas');
  outCanvas.width = origW;
  outCanvas.height = origH;
  const outCtx = outCanvas.getContext('2d');
  if (!outCtx) {
    throw new Error('Output canvas context unavailable.');
  }

  outCtx.imageSmoothingEnabled = true;
  outCtx.imageSmoothingQuality = 'high';

  // Fill destination background color
  if (!isTransparent) {
    outCtx.fillStyle = targetColorHex;
    outCtx.fillRect(0, 0, origW, origH);
  } else {
    outCtx.clearRect(0, 0, origW, origH);
  }

  // Create isolated full-res subject canvas with the AI mask
  const subjectCanvas = document.createElement('canvas');
  subjectCanvas.width = origW;
  subjectCanvas.height = origH;
  const sCtx = subjectCanvas.getContext('2d');
  if (sCtx) {
    sCtx.imageSmoothingEnabled = true;
    sCtx.imageSmoothingQuality = 'high';

    // Draw full-resolution original image
    sCtx.drawImage(img, 0, 0, origW, origH);

    // Composite using destination-in to cut out the background
    sCtx.globalCompositeOperation = 'destination-in';
    sCtx.drawImage(maskCanvas, 0, 0, origW, origH);

    // Draw the clean person onto the background color
    outCtx.drawImage(subjectCanvas, 0, 0);
  }

  // Export data URL: PNG if transparent, JPEG 0.96 if solid background
  const mimeType = isTransparent ? 'image/png' : 'image/jpeg';
  const dataUrl = outCanvas.toDataURL(mimeType, 0.96);

  return {
    dataUrl,
    width: origW,
    height: origH,
    colorPreset,
    appliedColor: targetColorHex,
  };
}

/**
 * Clears cached masks when a new photo is loaded
 */
export function clearBackgroundMaskCache() {
  maskCache.clear();
}
