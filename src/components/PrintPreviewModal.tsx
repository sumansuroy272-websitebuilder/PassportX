import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Printer,
  Download,
  X,
  Scissors,
  Maximize2,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Sliders,
  Check,
  Info,
  ShieldCheck,
  FileText,
  Sparkles,
} from 'lucide-react';
import {
  PaperSize,
  PAPER_SIZES,
  PrintLayoutConfig,
  DEFAULT_PRINT_CONFIG,
  AspectRatioPreset,
} from '../types/passport';
import {
  calculatePrintLayout,
  renderPrintSheetCanvas,
  CalculatedPrintLayout,
} from '../utils/printLayout';
import { loadImageElement } from '../utils/imageProcessing';

export interface PrintPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  photoUrl: string;
  aspectPreset: AspectRatioPreset;
  initialPaperSizeId?: 'a4' | '4x6' | 'us-letter';
  initialOrientation?: 'portrait' | 'landscape';
  initialPhotoCount?: number;
}

export const PrintPreviewModal: React.FC<PrintPreviewModalProps> = ({
  isOpen,
  onClose,
  photoUrl,
  aspectPreset,
  initialPaperSizeId = 'a4',
  initialOrientation = 'portrait',
  initialPhotoCount = 6,
}) => {
  const initialPaper = useMemo(
    () => PAPER_SIZES.find((p) => p.id === initialPaperSizeId) || PAPER_SIZES[0],
    [initialPaperSizeId]
  );

  const [config, setConfig] = useState<PrintLayoutConfig>({
    paperSize: initialPaper,
    orientation: initialOrientation,
    photoCount: initialPhotoCount,
    spacingMm: 4,
    marginMm: initialPaper.id === '4x6' ? 6 : 10,
    showCutLines: true,
  });

  const [zoomLevel, setZoomLevel] = useState<'fit' | 'actual' | number>('fit');
  const [isGeneratingDownload, setIsGeneratingDownload] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [showRulers, setShowRulers] = useState(true);

  // Sync when initial paper changes
  useEffect(() => {
    if (isOpen) {
      const paper = PAPER_SIZES.find((p) => p.id === initialPaperSizeId) || PAPER_SIZES[0];
      setConfig((prev) => ({
        ...prev,
        paperSize: paper,
        orientation: initialOrientation,
        photoCount: initialPhotoCount,
        marginMm: paper.id === '4x6' ? 6 : 10,
      }));
      setZoomLevel('fit');
    }
  }, [isOpen, initialPaperSizeId, initialOrientation, initialPhotoCount]);

  // Compute layout grid
  const layout: CalculatedPrintLayout = useMemo(() => {
    return calculatePrintLayout({
      config,
      photoWidthMm: aspectPreset.widthMm,
      photoHeightMm: aspectPreset.heightMm,
    });
  }, [config, aspectPreset]);

  // Handle Paper Size Change (A4 vs 4x6 vs US Letter)
  const handlePaperSizeSelect = (paper: PaperSize) => {
    const isSmallPhotoPaper = paper.id === '4x6';
    setConfig((prev) => ({
      ...prev,
      paperSize: paper,
      marginMm: isSmallPhotoPaper ? 6 : 10,
      // If switching to 4x6, adjust count to fit nicely if current count exceeds capacity
      photoCount: isSmallPhotoPaper
        ? Math.min(prev.photoCount, 6)
        : prev.photoCount,
    }));
  };

  // Toggle Orientation
  const handleToggleOrientation = () => {
    setConfig((prev) => ({
      ...prev,
      orientation: prev.orientation === 'portrait' ? 'landscape' : 'portrait',
    }));
  };

  // Adjust photo count
  const handleCountChange = (newCount: number) => {
    setConfig((prev) => ({
      ...prev,
      photoCount: Math.max(1, Math.min(newCount, layout.maxCapacity)),
    }));
  };

  const handleFillPage = () => {
    handleCountChange(layout.maxCapacity);
  };

  // Trigger System Print Dialog
  const handlePrintNow = () => {
    // Add print modal active class to body so only this preview sheet is printed
    document.body.classList.add('print-modal-active');

    // Create dynamic style tag for exact @page paper dimensions
    const styleId = 'dynamic-print-preview-page-style';
    let styleEl = document.getElementById(styleId) as HTMLStyleElement | null;
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = styleId;
      document.head.appendChild(styleEl);
    }

    const orientation = config.orientation;
    const paperName = config.paperSize.id === '4x6' ? '4in 6in' : config.paperSize.id === 'us-letter' ? 'letter' : 'A4';
    styleEl.innerHTML = `
      @media print {
        @page {
          size: ${paperName} ${orientation};
          margin: 0;
        }
      }
    `;

    window.print();

    // Clean up after print dialog closes
    setTimeout(() => {
      document.body.classList.remove('print-modal-active');
      if (styleEl) {
        styleEl.remove();
      }
    }, 1000);
  };

  // Download High-Res 300 DPI Sheet
  const handleDownloadSheet = async () => {
    try {
      setIsGeneratingDownload(true);
      const photoImg = await loadImageElement(photoUrl);

      const sheetDataUrl = await renderPrintSheetCanvas({
        photoImage: photoImg,
        layout,
        showCutLines: config.showCutLines,
        targetDpi: 300,
      });

      const link = document.createElement('a');
      link.href = sheetDataUrl;
      link.download = `passport-print-sheet-${config.paperSize.id}-${config.orientation}-${layout.activeCount}copies-${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 4000);
    } catch (err) {
      console.error('Failed to generate sheet:', err);
      alert('Could not render sheet for download.');
    } finally {
      setIsGeneratingDownload(false);
    }
  };

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="print-preview-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto"
    >
      <div className="relative w-full max-w-5xl bg-white rounded-2xl shadow-2xl border border-slate-200/90 flex flex-col max-h-[96vh] overflow-hidden my-auto">
        {/* Header */}
        <div className="no-print flex items-center justify-between px-4 sm:px-6 py-3.5 bg-slate-900 text-white rounded-t-2xl border-b border-slate-800 gap-3">
          <div className="flex items-center gap-2.5 truncate">
            <div className="w-8 h-8 rounded-lg bg-blue-600/90 flex items-center justify-center text-white shrink-0 shadow-xs">
              <Printer className="w-4 h-4" />
            </div>
            <div className="truncate">
              <h2
                id="print-preview-title"
                className="text-sm sm:text-base font-bold text-white flex items-center gap-2 truncate"
              >
                <span>Print Preview</span>
                <span className="text-xs font-normal text-blue-300 hidden sm:inline font-sans">
                  (প্রিন্ট প্রিভিউ)
                </span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300">
                  {config.paperSize.name} · {config.orientation}
                </span>
              </h2>
              <p className="text-[11px] text-slate-400 truncate">
                Inspect physical size ({aspectPreset.widthMm}×{aspectPreset.heightMm}mm), alignment, cut guides &amp; margins before printing
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              aria-label="Close Print Preview"
              className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Paper Selection & Quick Controls Bar */}
        <div className="no-print px-4 sm:px-6 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Paper Size Tabs (A4 / 4x6 / US Letter) */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-200/80 rounded-xl">
            <button
              type="button"
              onClick={() => handlePaperSizeSelect(PAPER_SIZES[0])} // A4
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                config.paperSize.id === 'a4'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-blue-600" />
              <span>Standard A4</span>
              <span className="text-[10px] font-normal text-slate-500 hidden md:inline">
                (210×297mm)
              </span>
            </button>

            <button
              type="button"
              onClick={() => handlePaperSizeSelect(PAPER_SIZES[2])} // 4x6 photo paper
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                config.paperSize.id === '4x6'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Photo Paper 4×6 in</span>
              <span className="text-[10px] font-normal text-slate-500 hidden md:inline">
                (10×15cm)
              </span>
            </button>

            <button
              type="button"
              onClick={() => handlePaperSizeSelect(PAPER_SIZES[1])} // US Letter
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer hidden sm:flex items-center gap-1.5 ${
                config.paperSize.id === 'us-letter'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              <span>US Letter</span>
            </button>
          </div>

          {/* Quick Options: Orientation, Cut Lines, & Zoom */}
          <div className="flex items-center gap-2">
            {/* Orientation button */}
            <button
              type="button"
              onClick={handleToggleOrientation}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-medium flex items-center gap-1 cursor-pointer transition-colors"
              title="Toggle Portrait / Landscape"
            >
              <RotateCw className="w-3.5 h-3.5 text-slate-500" />
              <span className="capitalize">{config.orientation}</span>
            </button>

            {/* Cut Lines Toggle */}
            <button
              type="button"
              onClick={() =>
                setConfig((prev) => ({
                  ...prev,
                  showCutLines: !prev.showCutLines,
                }))
              }
              className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1 cursor-pointer transition-colors ${
                config.showCutLines
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100'
              }`}
              title="Toggle cutting guidelines & corner ticks"
            >
              <Scissors className="w-3.5 h-3.5" />
              <span>Cut Guides</span>
              {config.showCutLines && <Check className="w-3 h-3 text-blue-600 ml-0.5" />}
            </button>

            {/* Photo Copies Stepper */}
            <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5">
              <button
                type="button"
                onClick={() => handleCountChange(config.photoCount - 1)}
                disabled={config.photoCount <= 1}
                className="w-6 h-6 flex items-center justify-center font-bold text-slate-600 hover:bg-slate-100 rounded disabled:opacity-40 cursor-pointer"
              >
                -
              </button>
              <span className="px-2 font-mono font-bold text-slate-900 text-xs">
                {layout.activeCount}
              </span>
              <button
                type="button"
                onClick={() => handleCountChange(config.photoCount + 1)}
                disabled={config.photoCount >= layout.maxCapacity}
                className="w-6 h-6 flex items-center justify-center font-bold text-slate-600 hover:bg-slate-100 rounded disabled:opacity-40 cursor-pointer"
              >
                +
              </button>
            </div>

            <button
              type="button"
              onClick={handleFillPage}
              className="px-2 py-1.5 rounded-lg bg-slate-200/90 hover:bg-slate-300 text-slate-700 font-semibold text-[11px] cursor-pointer hidden md:inline"
            >
              Fill ({layout.maxCapacity})
            </button>
          </div>
        </div>

        {downloadSuccess && (
          <div className="no-print mx-4 sm:mx-6 mt-3 p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>High-resolution 300 DPI sheet image downloaded successfully!</span>
          </div>
        )}

        {/* Main Preview Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-900/95 flex flex-col items-center justify-center min-h-[360px] sm:min-h-[460px]">
          {/* Printable Sheet Viewport with Drop Shadow */}
          <div
            className="relative flex items-center justify-center w-full transition-all duration-200"
            style={{
              maxWidth: config.orientation === 'landscape' ? '680px' : '480px',
            }}
          >
            {/* The True-to-Scale Sheet Paper Container */}
            <div
              id="printable-preview-sheet"
              className="relative bg-white shadow-2xl transition-all duration-200 select-none overflow-hidden border border-slate-300"
              style={{
                width: '100%',
                aspectRatio: `${layout.paperWidthMm} / ${layout.paperHeightMm}`,
              }}
            >
              {/* Paper Margin Boundary Indicator (Safe non-printable boundary) */}
              <div
                className="absolute border border-dashed border-slate-300/80 pointer-events-none"
                style={{
                  top: `${(config.marginMm / layout.paperHeightMm) * 100}%`,
                  bottom: `${(config.marginMm / layout.paperHeightMm) * 100}%`,
                  left: `${(config.marginMm / layout.paperWidthMm) * 100}%`,
                  right: `${(config.marginMm / layout.paperWidthMm) * 100}%`,
                }}
              >
                <span className="absolute top-0.5 left-1 text-[8px] font-mono text-slate-400 select-none">
                  Margin: {config.marginMm}mm
                </span>
              </div>

              {/* Photos Rendered on Sheet */}
              {layout.slots.map((slot) => {
                const leftPercent = (slot.xMm / layout.paperWidthMm) * 100;
                const topPercent = (slot.yMm / layout.paperHeightMm) * 100;
                const widthPercent = (slot.widthMm / layout.paperWidthMm) * 100;
                const heightPercent = (slot.heightMm / layout.paperHeightMm) * 100;

                return (
                  <div
                    key={slot.index}
                    className="absolute group"
                    style={{
                      left: `${leftPercent}%`,
                      top: `${topPercent}%`,
                      width: `${widthPercent}%`,
                      height: `${heightPercent}%`,
                    }}
                  >
                    {/* The Passport Photo with crisp border */}
                    <div className="w-full h-full relative overflow-hidden border border-black/40">
                      <img
                        src={photoUrl}
                        alt={`Passport photo copy ${slot.index + 1}`}
                        className="w-full h-full object-cover block"
                      />
                    </div>

                    {/* Scissor Cutting Lines / Corner Ticks */}
                    {config.showCutLines && (
                      <div className="absolute inset-0 border border-dashed border-slate-400/90 pointer-events-none">
                        {/* Corner ticks */}
                        <div className="absolute -top-1 -left-1 w-2 h-2 border-t border-l border-slate-700 pointer-events-none" />
                        <div className="absolute -top-1 -right-1 w-2 h-2 border-t border-r border-slate-700 pointer-events-none" />
                        <div className="absolute -bottom-1 -left-1 w-2 h-2 border-b border-l border-slate-700 pointer-events-none" />
                        <div className="absolute -bottom-1 -right-1 w-2 h-2 border-b border-r border-slate-700 pointer-events-none" />
                      </div>
                    )}

                    {/* Hover index badge */}
                    <div className="no-print absolute bottom-0.5 right-0.5 bg-slate-900/80 text-white text-[8px] font-mono px-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      #{slot.index + 1}
                    </div>
                  </div>
                );
              })}

              {/* Sheet Bottom Footer Label */}
              <div
                className="absolute bottom-1 left-0 right-0 text-center text-[9px] text-slate-400 font-sans pointer-events-none px-2 truncate"
                style={{
                  fontSize: 'clamp(7px, 1.2cqw, 10px)',
                }}
              >
                PassportX · {config.paperSize.name} ({layout.paperWidthMm}×{layout.paperHeightMm}mm) · {layout.activeCount} photos ({layout.photoWidthMm}×{layout.photoHeightMm}mm) · Print at 100% Scale
              </div>
            </div>
          </div>

          {/* Dimension Readouts Bar underneath sheet */}
          <div className="no-print mt-3 flex items-center justify-between text-xs text-slate-400 w-full max-w-lg px-2">
            <span className="flex items-center gap-1">
              <span>Paper:</span>
              <strong className="text-white">{config.paperSize.name}</strong>
              <span>({layout.paperWidthMm} × {layout.paperHeightMm} mm)</span>
            </span>

            <span className="flex items-center gap-1">
              <span>Photo:</span>
              <strong className="text-white">{aspectPreset.name}</strong>
              <span>({layout.activeCount} photos)</span>
            </span>

            <span className="text-emerald-400 font-mono font-medium hidden sm:inline">
              100% Actual Scale
            </span>
          </div>
        </div>

        {/* Pre-Print Crucial Checklist & Bottom Action Buttons */}
        <div className="no-print p-4 sm:px-6 bg-white border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Print Scale Checklist Tip */}
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <div className="w-5 h-5 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 font-bold">
              !
            </div>
            <span>
              <strong>Crucial Printer Tip:</strong> In printer settings, set <strong>Scale: 100%</strong> or <strong>&ldquo;Actual Size&rdquo;</strong> (do not select &ldquo;Fit to Page&rdquo;).
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
            <button
              type="button"
              onClick={handleDownloadSheet}
              disabled={isGeneratingDownload}
              className="px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 min-h-[42px]"
              title="Download 300 DPI image file for USB or photo kiosk printing"
            >
              {isGeneratingDownload ? (
                <div className="w-4 h-4 border-2 border-slate-600 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Download className="w-4 h-4 text-slate-600" />
              )}
              <span>Download Sheet</span>
            </button>

            <button
              type="button"
              onClick={handlePrintNow}
              className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer min-h-[42px]"
              title="Open system print dialog with exact paper dimensions"
            >
              <Printer className="w-4 h-4" />
              <span>Print Now (প্রিন্ট করুন)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
