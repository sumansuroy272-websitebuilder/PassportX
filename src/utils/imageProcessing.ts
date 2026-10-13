import { EditorAdjustments, AspectRatioPreset } from '../types/passport';

/**
 * Validates uploaded file MIME type and extension
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  if (!file) {
    return { valid: false, error: 'No file selected.' };
  }

  const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
  const validExtensions = ['.jpg', '.jpeg', '.png'];
  const fileName = file.name.toLowerCase();

  const hasValidType = validTypes.includes(file.type.toLowerCase());
  const hasValidExt = validExtensions.some((ext) => fileName.endsWith(ext));

  if (!hasValidType && !hasValidExt) {
    return {
      valid: false,
      error: 'Please upload a JPG, JPEG or PNG image.',
    };
  }

  // File size sanity check (reject files > 50MB to prevent browser crash)
  if (file.size > 50 * 1024 * 1024) {
    return {
      valid: false,
      error: 'Image is too large (maximum supported file size is 50MB).',
    };
  }

  return { valid: true };
}

/**
 * Loads an image from a URL or object URL and inspects dimensions
 */
export function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => {
      reject(new Error('The selected image could not be loaded or is corrupted.'));
    };
    img.src = src;
  });
}

/**
 * Safely downscales extremely large photos (e.g. > 3200px) in browser memory
 * while retaining full print-grade clarity (600+ DPI equivalent).
 */
export async function optimizeImageIfNeeded(
  file: File,
  img: HTMLImageElement
): Promise<{ url: string; width: number; height: number }> {
  const MAX_DIMENSION = 3200;
  const { naturalWidth, naturalHeight } = img;

  if (naturalWidth <= MAX_DIMENSION && naturalHeight <= MAX_DIMENSION) {
    return {
      url: URL.createObjectURL(file),
      width: naturalWidth,
      height: naturalHeight,
    };
  }

  // Calculate scaled dimensions
  let newW = naturalWidth;
  let newH = naturalHeight;
  if (naturalWidth > naturalHeight) {
    newW = MAX_DIMENSION;
    newH = Math.round((naturalHeight * MAX_DIMENSION) / naturalWidth);
  } else {
    newH = MAX_DIMENSION;
    newW = Math.round((naturalWidth * MAX_DIMENSION) / naturalHeight);
  }

  const canvas = document.createElement('canvas');
  canvas.width = newW;
  canvas.height = newH;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return {
      url: URL.createObjectURL(file),
      width: naturalWidth,
      height: naturalHeight,
    };
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, newW, newH);

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, 'image/jpeg', 0.96);
  });

  if (!blob) {
    return {
      url: URL.createObjectURL(file),
      width: naturalWidth,
      height: naturalHeight,
    };
  }

  return {
    url: URL.createObjectURL(blob),
    width: newW,
    height: newH,
  };
}

/**
 * Creates CSS filter string for live preview
 */
export function getCssFilterString(adj: EditorAdjustments): string {
  const brightnessVal = 1 + adj.brightness / 100;
  const contrastVal = 1 + adj.contrast / 100;
  const saturateVal = Math.max(0, 1 + adj.saturation / 100);
  const grayscaleVal = adj.grayscale ? 'grayscale(100%)' : 'grayscale(0%)';

  return `brightness(${brightnessVal}) contrast(${contrastVal}) saturate(${saturateVal}) ${grayscaleVal}`;
}

/**
 * Renders the final cropped, adjusted photo to a high-DPI canvas (e.g. 600 DPI)
 * and returns a data URL or Blob.
 */
export async function renderHighResPhoto(params: {
  image: HTMLImageElement;
  aspectPreset: AspectRatioPreset;
  frameWidth: number; // width of crop frame in UI (px)
  frameHeight: number; // height of crop frame in UI (px)
  baseScale: number; // base scale in UI
  zoom: number;
  pan: { x: number; y: number };
  rotation: number; // degrees: 0, 90, 180, 270
  adjustments: EditorAdjustments;
  targetDpi?: number; // default 600 DPI for crystal clear print
  backgroundColor?: string; // e.g. '#FFFFFF', '#70B5F9', or 'transparent'
}): Promise<string> {
  const {
    image,
    aspectPreset,
    frameWidth,
    baseScale,
    zoom,
    pan,
    rotation,
    adjustments,
    targetDpi = 600,
    backgroundColor = '#FFFFFF',
  } = params;

  // 1 inch = 25.4 mm
  const exportW = Math.round((aspectPreset.widthMm / 25.4) * targetDpi);
  const exportH = Math.round((aspectPreset.heightMm / 25.4) * targetDpi);

  const canvas = document.createElement('canvas');
  canvas.width = exportW;
  canvas.height = exportH;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Canvas 2D context unavailable.');
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Background fill (standard White #FFFFFF or Sky Blue #70B5F9 or transparent)
  if (backgroundColor === 'transparent') {
    ctx.clearRect(0, 0, exportW, exportH);
  } else {
    ctx.fillStyle = backgroundColor || '#FFFFFF';
    ctx.fillRect(0, 0, exportW, exportH);
  }

  // Apply filters
  const filterStr = getCssFilterString(adjustments);
  ctx.filter = filterStr;

  const scaleRatio = exportW / frameWidth;

  ctx.save();
  // Move to center of canvas
  ctx.translate(exportW / 2, exportH / 2);
  // Apply scaled pan
  ctx.translate(pan.x * scaleRatio, pan.y * scaleRatio);
  // Apply rotation
  ctx.rotate((rotation * Math.PI) / 180);

  const drawW = image.naturalWidth * baseScale * zoom * scaleRatio;
  const drawH = image.naturalHeight * baseScale * zoom * scaleRatio;

  ctx.drawImage(image, -drawW / 2, -drawH / 2, drawW, drawH);
  ctx.restore();

  const isPng = backgroundColor === 'transparent';
  return canvas.toDataURL(isPng ? 'image/png' : 'image/jpeg', 0.95);
}

/**
 * Creates an attractive high-res portrait sample headshot on a canvas for instant demo testing
 */
export function createSamplePortraitDataUrl(): Promise<string> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 1500;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      resolve('');
      return;
    }

    // Clean neutral off-white / light grey studio backdrop
    const bgGrad = ctx.createLinearGradient(0, 0, 0, 1500);
    bgGrad.addColorStop(0, '#f1f5f9');
    bgGrad.addColorStop(1, '#e2e8f0');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 1200, 1500);

    // Subtle studio vignette
    const radial = ctx.createRadialGradient(600, 750, 200, 600, 750, 800);
    radial.addColorStop(0, 'rgba(255,255,255,0.4)');
    radial.addColorStop(1, 'rgba(0,0,0,0.06)');
    ctx.fillStyle = radial;
    ctx.fillRect(0, 0, 1200, 1500);

    // Torso / Navy Blazer
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(250, 1500);
    ctx.bezierCurveTo(270, 1150, 400, 1080, 500, 1070);
    ctx.lineTo(500, 1150);
    ctx.lineTo(700, 1150);
    ctx.lineTo(700, 1070);
    ctx.bezierCurveTo(800, 1080, 930, 1150, 950, 1500);
    ctx.closePath();
    ctx.fillStyle = '#1e293b';
    ctx.fill();

    // White shirt collar
    ctx.beginPath();
    ctx.moveTo(500, 1070);
    ctx.lineTo(600, 1200);
    ctx.lineTo(700, 1070);
    ctx.lineTo(650, 1030);
    ctx.lineTo(550, 1030);
    ctx.closePath();
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    // Neck
    ctx.beginPath();
    ctx.moveTo(520, 920);
    ctx.lineTo(520, 1080);
    ctx.lineTo(680, 1080);
    ctx.lineTo(680, 920);
    ctx.closePath();
    ctx.fillStyle = '#f6c3a5';
    ctx.fill();

    // Neck shadow under chin
    ctx.beginPath();
    ctx.ellipse(600, 950, 90, 35, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.08)';
    ctx.fill();

    // Head / Face
    ctx.beginPath();
    ctx.ellipse(600, 700, 210, 270, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#fed7aa';
    ctx.fill();

    // Hair
    ctx.beginPath();
    ctx.ellipse(600, 520, 240, 180, 0, Math.PI, Math.PI * 2);
    ctx.bezierCurveTo(850, 520, 830, 780, 820, 820);
    ctx.bezierCurveTo(800, 680, 780, 560, 600, 550);
    ctx.bezierCurveTo(420, 560, 400, 680, 380, 820);
    ctx.bezierCurveTo(370, 780, 350, 520, 600, 520);
    ctx.closePath();
    ctx.fillStyle = '#292524';
    ctx.fill();

    // Eyebrows
    ctx.strokeStyle = '#292524';
    ctx.lineWidth = 9;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(490, 640);
    ctx.quadraticCurveTo(535, 625, 570, 638);
    ctx.moveTo(630, 638);
    ctx.quadraticCurveTo(665, 625, 710, 640);
    ctx.stroke();

    // Eyes
    ctx.fillStyle = '#ffffff';
    // Left eye
    ctx.beginPath();
    ctx.ellipse(530, 675, 30, 18, 0, 0, Math.PI * 2);
    ctx.fill();
    // Right eye
    ctx.beginPath();
    ctx.ellipse(670, 675, 30, 18, 0, 0, Math.PI * 2);
    ctx.fill();

    // Iris & pupils
    ctx.fillStyle = '#3b2f2f';
    ctx.beginPath();
    ctx.arc(530, 675, 14, 0, Math.PI * 2);
    ctx.arc(670, 675, 14, 0, Math.PI * 2);
    ctx.fill();

    // Eye catchlights
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(526, 670, 4, 0, Math.PI * 2);
    ctx.arc(666, 670, 4, 0, Math.PI * 2);
    ctx.fill();

    // Nose
    ctx.strokeStyle = 'rgba(180, 83, 9, 0.4)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(600, 670);
    ctx.lineTo(595, 760);
    ctx.lineTo(615, 760);
    ctx.stroke();

    // Neutral friendly mouth (passport compliant neutral expression)
    ctx.strokeStyle = '#991b1b';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(555, 830);
    ctx.quadraticCurveTo(600, 835, 645, 830);
    ctx.stroke();

    // Cheeks subtle blush
    ctx.fillStyle = 'rgba(244, 63, 94, 0.08)';
    ctx.beginPath();
    ctx.ellipse(500, 750, 45, 25, 0, 0, Math.PI * 2);
    ctx.ellipse(700, 750, 45, 25, 0, 0, Math.PI * 2);
    ctx.fill();

    // Ears
    ctx.fillStyle = '#fecba1';
    ctx.beginPath();
    ctx.ellipse(385, 700, 22, 45, 0, 0, Math.PI * 2);
    ctx.ellipse(815, 700, 22, 45, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    resolve(canvas.toDataURL('image/jpeg', 0.95));
  });
}
