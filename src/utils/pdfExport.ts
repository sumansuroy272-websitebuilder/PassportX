import jsPDF from 'jspdf';
import { A4LayoutSettings, A4SmartGridResult } from '../types/passport';

export interface PdfExportOptions {
  processedPhotoUrl: string;
  settings: A4LayoutSettings;
  gridResult: A4SmartGridResult;
  filename?: string;
  onProgress?: (stage: 1 | 2 | 3 | 4) => void;
}

export interface PdfExportResult {
  blob: Blob;
  blobUrl: string;
  filename: string;
  download: () => void;
}

export interface PdfValidationResult {
  valid: boolean;
  errorMessage?: string;
}

/**
 * Validates image data, page layout, and slot coordinates before PDF generation.
 */
export async function validateLayoutAndImage(
  processedPhotoUrl: string,
  settings: A4LayoutSettings,
  gridResult: A4SmartGridResult
): Promise<PdfValidationResult> {
  // 1. Validate Image Data
  if (!processedPhotoUrl || typeof processedPhotoUrl !== 'string') {
    return { valid: false, errorMessage: 'Invalid image data' };
  }

  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Image failed to load'));
      img.src = processedPhotoUrl;
    });

    if (img.naturalWidth <= 0 || img.naturalHeight <= 0) {
      return { valid: false, errorMessage: 'Image has zero dimensions' };
    }
  } catch (err) {
    return { valid: false, errorMessage: 'Failed to parse processed image' };
  }

  // 2. Validate Layout Geometry
  if (!gridResult || !gridResult.fits) {
    return { valid: false, errorMessage: 'Layout exceeds page boundaries' };
  }

  if (!gridResult.slots || gridResult.slots.length === 0) {
    return { valid: false, errorMessage: 'No photo slots found in layout' };
  }

  if (gridResult.slots.length !== settings.copies) {
    return { valid: false, errorMessage: 'Photo count does not match requested copies' };
  }

  // 3. Validate Page Dimensions
  const expectedWidth = settings.orientation === 'portrait' ? 210 : 297;
  const expectedHeight = settings.orientation === 'portrait' ? 297 : 210;

  if (
    Math.abs(gridResult.paperWidthMm - expectedWidth) > 0.5 ||
    Math.abs(gridResult.paperHeightMm - expectedHeight) > 0.5
  ) {
    return { valid: false, errorMessage: 'Invalid A4 paper dimensions' };
  }

  // 4. Validate Each Photo Slot
  for (let i = 0; i < gridResult.slots.length; i++) {
    const slot = gridResult.slots[i];

    if (
      typeof slot.xMm !== 'number' ||
      isNaN(slot.xMm) ||
      !isFinite(slot.xMm) ||
      typeof slot.yMm !== 'number' ||
      isNaN(slot.yMm) ||
      !isFinite(slot.yMm)
    ) {
      return { valid: false, errorMessage: `Slot #${i + 1} has invalid coordinates (NaN/undefined)` };
    }

    if (
      typeof slot.widthMm !== 'number' ||
      isNaN(slot.widthMm) ||
      slot.widthMm <= 0 ||
      !isFinite(slot.widthMm) ||
      typeof slot.heightMm !== 'number' ||
      isNaN(slot.heightMm) ||
      slot.heightMm <= 0 ||
      !isFinite(slot.heightMm)
    ) {
      return { valid: false, errorMessage: `Slot #${i + 1} has invalid dimensions` };
    }

    // Boundary check: photo must not extend outside the A4 page
    if (
      slot.xMm < 0 ||
      slot.yMm < 0 ||
      slot.xMm + slot.widthMm > gridResult.paperWidthMm + 0.1 ||
      slot.yMm + slot.heightMm > gridResult.paperHeightMm + 0.1
    ) {
      return { valid: false, errorMessage: `Slot #${i + 1} extends outside page boundary` };
    }
  }

  return { valid: true };
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Generates and downloads a printable, high-quality A4 PDF using jsPDF.
 * Implements sequential stage notifications, strict Blank PDF Protection,
 * and physical millimeter accuracy.
 *
 * Filename defaults to: passport-printer.pdf
 */
export async function exportA4LayoutToPdf(options: PdfExportOptions): Promise<PdfExportResult> {
  const {
    processedPhotoUrl,
    settings,
    gridResult,
    filename = 'passport-printer.pdf',
    onProgress,
  } = options;

  // STAGE 1: Preparing your photo...
  onProgress?.(1);
  await sleep(180);

  // Pre-generation Validation
  const validation = await validateLayoutAndImage(processedPhotoUrl, settings, gridResult);
  if (!validation.valid) {
    console.error('PDF pre-validation failed:', validation.errorMessage);
    throw new Error("We couldn't generate the PDF. Please try again.");
  }

  // STAGE 2: Arranging your A4 sheet...
  onProgress?.(2);
  await sleep(180);

  // Create jsPDF instance with exact millimeter units & standard A4 format
  let doc: jsPDF;
  try {
    doc = new jsPDF({
      orientation: settings.orientation,
      unit: 'mm',
      format: 'a4',
      compress: false, // Maintain maximum image fidelity
    });
  } catch (err) {
    console.error('jsPDF initialization error:', err);
    throw new Error("We couldn't generate the PDF. Please try again.");
  }

  if (!doc) {
    throw new Error("We couldn't generate the PDF. Please try again.");
  }

  // Verify Page Dimensions in jsPDF
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const targetWidth = settings.orientation === 'portrait' ? 210 : 297;
  const targetHeight = settings.orientation === 'portrait' ? 297 : 210;

  if (Math.abs(pageWidth - targetWidth) > 1 || Math.abs(pageHeight - targetHeight) > 1) {
    console.error('jsPDF page dimension mismatch:', { pageWidth, pageHeight, targetWidth, targetHeight });
    throw new Error("We couldn't generate the PDF. Please try again.");
  }

  // STAGE 3: Generating print-ready PDF...
  onProgress?.(3);
  await sleep(200);

  // Add Photos & Black Borders
  let photosAddedCount = 0;
  const { slots } = gridResult;

  for (const slot of slots) {
    try {
      doc.addImage(
        processedPhotoUrl,
        'JPEG',
        slot.xMm,
        slot.yMm,
        slot.widthMm,
        slot.heightMm,
        undefined,
        'NONE' // Highest quality render
      );
      photosAddedCount++;

      // Clean Black Border: Drawn strictly inside the photo boundary to avoid clipping or overlapping adjacent photos
      if (settings.border.enabled) {
        doc.setDrawColor(0, 0, 0);
        // 1px at 300 DPI corresponds to ~0.254 mm
        const strokeMm = settings.border.widthPx === 1 ? 0.25 : 0.5;
        doc.setLineWidth(strokeMm);
        // Inset stroke by half-width so the border remains strictly inside the photo boundary
        const halfStroke = strokeMm / 2;
        doc.rect(
          slot.xMm + halfStroke,
          slot.yMm + halfStroke,
          slot.widthMm - strokeMm,
          slot.heightMm - strokeMm,
          'S'
        );
      }

      // Precision scissor cut tick marks (outside photo boundaries)
      doc.setDrawColor(190, 190, 190);
      doc.setLineWidth(0.15);
      const tick = 2.0; // 2mm tick marks
      const { xMm: x, yMm: y, widthMm: w, heightMm: h } = slot;

      // Top-left
      doc.line(x - tick, y, x, y);
      doc.line(x, y - tick, x, y);
      // Top-right
      doc.line(x + w, y, x + w + tick, y);
      doc.line(x + w, y - tick, x + w, y);
      // Bottom-left
      doc.line(x - tick, y + h, x, y + h);
      doc.line(x, y + h, x, y + h + tick);
      // Bottom-right
      doc.line(x + w, y + h, x + w + tick, y + h);
      doc.line(x + w, y + h, x + w, y + h + tick);
    } catch (err) {
      console.error(`Failed to add photo slot #${photosAddedCount + 1}:`, err);
      throw new Error("We couldn't generate the PDF. Please try again.");
    }
  }

  // Blank PDF Protection Verification
  if (photosAddedCount === 0 || photosAddedCount !== slots.length) {
    console.error('Blank PDF protection triggered: photosAddedCount mismatch', {
      photosAddedCount,
      expected: slots.length,
    });
    throw new Error("We couldn't generate the PDF. Please try again.");
  }

  // STAGE 4: Finalizing your document...
  onProgress?.(4);
  await sleep(150);

  // Verify PDF Output Integrity
  let pdfBlob: Blob;
  try {
    pdfBlob = doc.output('blob');
    if (!pdfBlob || pdfBlob.size < 1024) {
      console.error('Generated PDF blob is empty or too small:', pdfBlob?.size);
      throw new Error("We couldn't generate the PDF. Please try again.");
    }
  } catch (err) {
    console.error('Failed to output PDF blob:', err);
    throw new Error("We couldn't generate the PDF. Please try again.");
  }

  // Create persistent Object URL for instant "Download Again"
  const blobUrl = URL.createObjectURL(pdfBlob);

  const triggerDownload = () => {
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Initial trigger download
  try {
    triggerDownload();
  } catch (err) {
    console.error('Failed to trigger initial PDF download:', err);
    throw new Error("We couldn't generate the PDF. Please try again.");
  }

  return {
    blob: pdfBlob,
    blobUrl,
    filename,
    download: triggerDownload,
  };
}
