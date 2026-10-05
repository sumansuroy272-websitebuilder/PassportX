import {
  A4LayoutSettings,
  A4SmartGridResult,
  A4PhotoSlot,
  PhotoSizeConfig,
} from '../types/passport';

export const A4_WIDTH_MM = 210;
export const A4_HEIGHT_MM = 297;

/**
 * Converts any DimensionUnit (mm, inch, px) to exact physical millimeters
 */
export function convertToMm(
  value: number,
  unit: 'mm' | 'inch' | 'px',
  targetDpi: number = 300
): number {
  if (unit === 'inch') {
    return Math.round(value * 25.4 * 100) / 100;
  }
  if (unit === 'px') {
    return Math.round(((value / targetDpi) * 25.4) * 100) / 100;
  }
  return Math.round(value * 100) / 100;
}

/**
 * Calculates the exact physical millimeters for a PhotoSizeConfig
 */
export function resolvePhotoDimensionsMm(config: PhotoSizeConfig): {
  widthMm: number;
  heightMm: number;
} {
  if (config.preset === '35x45') {
    return { widthMm: 35, heightMm: 45 };
  }
  if (config.preset === '2x2') {
    // 2 x 2 inch = 50.8 x 50.8 mm
    return { widthMm: 50.8, heightMm: 50.8 };
  }
  // Custom size
  return {
    widthMm: convertToMm(config.width, config.unit),
    heightMm: convertToMm(config.height, config.unit),
  };
}

/**
 * Automatically calculates the best rows x columns arrangement for A4 sheet.
 * Considers photo dimensions, page orientation, copy count, margins, spacing, and border.
 */
export function computeA4SmartGrid(settings: A4LayoutSettings): A4SmartGridResult {
  const { orientation, copies, photoSize, margins, spacing, border } = settings;

  // Exact A4 dimensions in millimeters
  const paperWidthMm = orientation === 'landscape' ? A4_HEIGHT_MM : A4_WIDTH_MM; // 297 or 210
  const paperHeightMm = orientation === 'landscape' ? A4_WIDTH_MM : A4_HEIGHT_MM; // 210 or 297

  const { widthMm: photoW, heightMm: photoH } = resolvePhotoDimensionsMm(photoSize);

  // Validation: individual photo exceeds sheet dimensions
  if (photoW > paperWidthMm || photoH > paperHeightMm || photoW <= 0 || photoH <= 0 || copies <= 0) {
    return {
      fits: false,
      errorMessage:
        'These photos cannot fit on one A4 sheet at the selected size. Reduce the number of copies or choose a smaller photo size.',
      paperWidthMm,
      paperHeightMm,
      cols: 0,
      rows: 0,
      slots: [],
      totalGridWidthMm: 0,
      totalGridHeightMm: 0,
      actualMargins: { top: 0, bottom: 0, left: 0, right: 0 },
      actualSpacing: { horizontal: 0, vertical: 0 },
    };
  }

  // Determine spacing to use
  const sH = spacing.isAuto ? 5 : Math.max(0, spacing.horizontal);
  const sV = spacing.isAuto ? 5 : Math.max(0, spacing.vertical);

  // Minimum required margins
  const minMarginLeft = margins.isAuto ? 10 : Math.max(0, margins.left);
  const minMarginRight = margins.isAuto ? 10 : Math.max(0, margins.right);
  const minMarginTop = margins.isAuto ? 10 : Math.max(0, margins.top);
  const minMarginBottom = margins.isAuto ? 10 : Math.max(0, margins.bottom);

  // Find all possible (cols, rows) combinations that can hold `copies` photos
  interface CandidateGrid {
    cols: number;
    rows: number;
    totalW: number;
    totalH: number;
    score: number;
  }

  const candidates: CandidateGrid[] = [];

  // Theoretical max columns and rows that can fit on paper
  const maxPossibleCols = Math.max(
    1,
    Math.floor((paperWidthMm - minMarginLeft - minMarginRight + sH) / (photoW + sH))
  );
  const maxPossibleRows = Math.max(
    1,
    Math.floor((paperHeightMm - minMarginTop - minMarginBottom + sV) / (photoH + sV))
  );

  for (let c = 1; c <= maxPossibleCols; c++) {
    const r = Math.ceil(copies / c);
    if (r > maxPossibleRows) continue;

    const totalW = c * photoW + (c - 1) * sH;
    const totalH = r * photoH + (r - 1) * sV;

    // Must fit on page with margins
    if (
      totalW + minMarginLeft + minMarginRight <= paperWidthMm &&
      totalH + minMarginTop + minMarginBottom <= paperHeightMm
    ) {
      // Score based on:
      // 1. Grid aspect ratio matching paper orientation
      const gridAspect = totalW / totalH;
      const paperAspect = paperWidthMm / paperHeightMm;
      const aspectPenalty = Math.abs(Math.log(gridAspect / paperAspect));

      // 2. Minimize empty slots in the grid (e.g. 6 photos in 2x3 has 0 empty slots vs 2x4 which has 2 empty slots)
      const emptySlotsPenalty = (c * r - copies) * 0.15;

      // 3. Balance score
      const score = aspectPenalty + emptySlotsPenalty;

      candidates.push({
        cols: c,
        rows: r,
        totalW,
        totalH,
        score,
      });
    }
  }

  // If no combination can physically fit on one A4 sheet
  if (candidates.length === 0) {
    return {
      fits: false,
      errorMessage:
        'These photos cannot fit on one A4 sheet at the selected size. Reduce the number of copies or choose a smaller photo size.',
      paperWidthMm,
      paperHeightMm,
      cols: 0,
      rows: 0,
      slots: [],
      totalGridWidthMm: 0,
      totalGridHeightMm: 0,
      actualMargins: {
        top: minMarginTop,
        bottom: minMarginBottom,
        left: minMarginLeft,
        right: minMarginRight,
      },
      actualSpacing: { horizontal: sH, vertical: sV },
    };
  }

  // Sort by best score (lowest penalty)
  candidates.sort((a, b) => a.score - b.score);
  const best = candidates[0];

  // Calculate actual margins
  let actualLeft = minMarginLeft;
  let actualRight = minMarginRight;
  let actualTop = minMarginTop;
  let actualBottom = minMarginBottom;

  if (margins.isAuto) {
    // Perfectly center the grid horizontally and vertically
    const remainingW = Math.max(0, paperWidthMm - best.totalW);
    actualLeft = Math.round((remainingW / 2) * 10) / 10;
    actualRight = actualLeft;

    const remainingH = Math.max(0, paperHeightMm - best.totalH);
    actualTop = Math.round((remainingH / 2) * 10) / 10;
    actualBottom = actualTop;
  }

  // Generate slots for each photo instance
  const slots: A4PhotoSlot[] = [];
  for (let i = 0; i < copies; i++) {
    const col = i % best.cols;
    const row = Math.floor(i / best.cols);

    slots.push({
      index: i,
      xMm: actualLeft + col * (photoW + sH),
      yMm: actualTop + row * (photoH + sV),
      widthMm: photoW,
      heightMm: photoH,
    });
  }

  return {
    fits: true,
    paperWidthMm,
    paperHeightMm,
    cols: best.cols,
    rows: best.rows,
    slots,
    totalGridWidthMm: best.totalW,
    totalGridHeightMm: best.totalH,
    actualMargins: {
      top: actualTop,
      bottom: actualBottom,
      left: actualLeft,
      right: actualRight,
    },
    actualSpacing: {
      horizontal: sH,
      vertical: sV,
    },
  };
}
