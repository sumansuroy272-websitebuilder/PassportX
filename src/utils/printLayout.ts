import { PrintLayoutConfig, PaperSize } from '../types/passport';

export interface PhotoSlot {
  index: number;
  xMm: number;
  yMm: number;
  widthMm: number;
  heightMm: number;
}

export interface CalculatedPrintLayout {
  paperWidthMm: number;
  paperHeightMm: number;
  cols: number;
  rows: number;
  maxCapacity: number;
  activeCount: number;
  photoWidthMm: number;
  photoHeightMm: number;
  gridWidthMm: number;
  gridHeightMm: number;
  startXmm: number;
  startYmm: number;
  slots: PhotoSlot[];
}

/**
 * Calculates optimal photo layout grid on paper sheet
 */
export function calculatePrintLayout(params: {
  config: PrintLayoutConfig;
  photoWidthMm: number;
  photoHeightMm: number;
}): CalculatedPrintLayout {
  const { config, photoWidthMm, photoHeightMm } = params;
  const { paperSize, orientation, photoCount, spacingMm, marginMm } = config;

  let paperWidthMm: number;
  let paperHeightMm: number;

  if (orientation === 'landscape') {
    paperWidthMm = Math.max(paperSize.widthMm, paperSize.heightMm);
    paperHeightMm = Math.min(paperSize.widthMm, paperSize.heightMm);
  } else {
    paperWidthMm = Math.min(paperSize.widthMm, paperSize.heightMm);
    paperHeightMm = Math.max(paperSize.widthMm, paperSize.heightMm);
  }

  // Printable area inside margins
  const availW = Math.max(10, paperWidthMm - 2 * marginMm);
  const availH = Math.max(10, paperHeightMm - 2 * marginMm);

  // Maximum columns and rows that can fit
  const maxCols = Math.max(
    1,
    Math.floor((availW + spacingMm) / (photoWidthMm + spacingMm))
  );
  const maxRows = Math.max(
    1,
    Math.floor((availH + spacingMm) / (photoHeightMm + spacingMm))
  );
  const maxCapacity = maxCols * maxRows;

  // Active count clamped to maximum capacity
  const activeCount = Math.max(1, Math.min(photoCount, maxCapacity));

  let cols: number;
  let rows: number;

  if (activeCount <= maxCols) {
    cols = activeCount;
    rows = 1;
  } else {
    cols = maxCols;
    rows = Math.ceil(activeCount / cols);
  }

  // Total grid bounding dimensions
  const gridWidthMm = cols * photoWidthMm + (cols - 1) * spacingMm;
  const gridHeightMm = rows * photoHeightMm + (rows - 1) * spacingMm;

  // Center the grid on the sheet
  const startXmm = Math.max(marginMm, (paperWidthMm - gridWidthMm) / 2);
  const startYmm = Math.max(marginMm, (paperHeightMm - gridHeightMm) / 2);

  const slots: PhotoSlot[] = [];
  for (let i = 0; i < activeCount; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);

    slots.push({
      index: i,
      xMm: startXmm + col * (photoWidthMm + spacingMm),
      yMm: startYmm + row * (photoHeightMm + spacingMm),
      widthMm: photoWidthMm,
      heightMm: photoHeightMm,
    });
  }

  return {
    paperWidthMm,
    paperHeightMm,
    cols,
    rows,
    maxCapacity,
    activeCount,
    photoWidthMm,
    photoHeightMm,
    gridWidthMm,
    gridHeightMm,
    startXmm,
    startYmm,
    slots,
  };
}

/**
 * Renders the full 300 DPI high-resolution print sheet canvas
 */
export async function renderPrintSheetCanvas(params: {
  photoImage: HTMLImageElement | HTMLCanvasElement;
  layout: CalculatedPrintLayout;
  showCutLines: boolean;
  targetDpi?: number;
}): Promise<string> {
  const { photoImage, layout, showCutLines, targetDpi = 300 } = params;
  const mmToPx = targetDpi / 25.4;

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(layout.paperWidthMm * mmToPx);
  canvas.height = Math.round(layout.paperHeightMm * mmToPx);
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Canvas 2D context unavailable.');
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Crisp white paper background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw photos onto sheet
  for (const slot of layout.slots) {
    const x = Math.round(slot.xMm * mmToPx);
    const y = Math.round(slot.yMm * mmToPx);
    const w = Math.round(slot.widthMm * mmToPx);
    const h = Math.round(slot.heightMm * mmToPx);

    // Draw passport photo
    ctx.drawImage(photoImage, x, y, w, h);

    // Cutting lines / guidelines
    if (showCutLines) {
      ctx.save();
      ctx.strokeStyle = 'rgba(100, 116, 139, 0.45)'; // subtle slate-500
      ctx.lineWidth = Math.max(1, Math.round(targetDpi / 300));
      ctx.setLineDash([4, 4]);

      // Draw faint boundary for scissor trimming
      ctx.strokeRect(x, y, w, h);

      // Corner tick marks extending slightly outward for precision cutting
      const tickLen = Math.round(2.5 * mmToPx);
      ctx.setLineDash([]);
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(71, 85, 105, 0.6)';

      // Top-left
      ctx.beginPath();
      ctx.moveTo(x - tickLen, y);
      ctx.lineTo(x, y);
      ctx.moveTo(x, y - tickLen);
      ctx.lineTo(x, y);
      // Top-right
      ctx.moveTo(x + w, y);
      ctx.lineTo(x + w + tickLen, y);
      ctx.moveTo(x + w, y - tickLen);
      ctx.lineTo(x + w, y);
      // Bottom-left
      ctx.moveTo(x - tickLen, y + h);
      ctx.lineTo(x, y + h);
      ctx.moveTo(x, y + h);
      ctx.lineTo(x, y + h + tickLen);
      // Bottom-right
      ctx.moveTo(x + w, y + h);
      ctx.lineTo(x + w + tickLen, y + h);
      ctx.moveTo(x + w, y + h);
      ctx.lineTo(x + w, y + h + tickLen);

      ctx.stroke();
      ctx.restore();
    }
  }

  // Print instruction footer on page margin (does not touch photos)
  ctx.save();
  ctx.font = `${Math.round(2.8 * mmToPx)}px sans-serif`;
  ctx.fillStyle = '#64748b';
  ctx.textAlign = 'center';
  const footerText = `PassportX · ${layout.photoWidthMm}×${layout.photoHeightMm}mm (${layout.activeCount} photos) · IMPORTANT: Print at 100% scale (Do Not Scale / Fit to Page)`;
  ctx.fillText(
    footerText,
    canvas.width / 2,
    canvas.height - Math.round(3.5 * mmToPx)
  );
  ctx.restore();

  return canvas.toDataURL('image/jpeg', 0.95);
}
