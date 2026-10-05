import React, { useState, useMemo, useEffect } from 'react';
import {
  Printer,
  ArrowLeft,
  Sparkles,
  AlertCircle,
  Maximize2,
  Sliders,
  Check,
  RotateCw,
  RotateCcw,
  Grid,
  Info,
  FileDown,
  Keyboard,
  ShieldCheck,
} from 'lucide-react';
import {
  A4LayoutSettings,
  DEFAULT_A4_SETTINGS,
  PhotoPresetType,
  DimensionUnit,
  COPY_PRESETS,
  PhotoSizeConfig,
  A4SmartGridResult,
} from '../types/passport';
import {
  computeA4SmartGrid,
  resolvePhotoDimensionsMm,
  A4_WIDTH_MM,
  A4_HEIGHT_MM,
} from '../utils/a4LayoutEngine';
import { exportA4LayoutToPdf, PdfExportResult } from '../utils/pdfExport';
import { HelperTooltip } from './HelperTooltip';
import { ShortcutsModal } from './ShortcutsModal';
import { PdfLoadingModal, PdfGenerationStage } from './PdfLoadingModal';

interface A4PrintLayoutProps {
  processedPhotoUrl: string;
  onBackToAdjust: () => void;
  initialPhotoSize?: PhotoSizeConfig;
  onPdfExported?: () => void;
  onGenerateFreshPhoto?: () => Promise<string>;
  onStartOver?: () => void;
}

export const A4PrintLayout: React.FC<A4PrintLayoutProps> = ({
  processedPhotoUrl,
  onBackToAdjust,
  initialPhotoSize,
  onPdfExported,
  onGenerateFreshPhoto,
  onStartOver,
}) => {
  const [settings, setSettings] = useState<A4LayoutSettings>(() => ({
    ...DEFAULT_A4_SETTINGS,
    photoSize: initialPhotoSize ? { ...initialPhotoSize } : { ...DEFAULT_A4_SETTINGS.photoSize },
  }));

  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [pdfSuccessMessage, setPdfSuccessMessage] = useState<string | null>(null);
  const [pdfErrorMessage, setPdfErrorMessage] = useState<string | null>(null);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);

  // PDF Generation Loading Overlay & Cached Result
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [pdfModalStage, setPdfModalStage] = useState<PdfGenerationStage>(1);
  const [cachedPdfResult, setCachedPdfResult] = useState<PdfExportResult | null>(null);

  const isMac =
    typeof navigator !== 'undefined' &&
    /Mac|iPod|iPhone|iPad/.test(navigator.platform || '');

  // Track if custom copy count is active
  const [isCustomCopies, setIsCustomCopies] = useState<boolean>(() => {
    return !COPY_PRESETS.includes(settings.copies as any);
  });

  // Calculate Smart Grid layout dynamically
  const gridResult: A4SmartGridResult = useMemo(() => {
    return computeA4SmartGrid(settings);
  }, [settings]);

  // Handler for Auto Arrange button
  const handleAutoArrange = () => {
    setSettings((prev) => ({
      ...prev,
      margins: {
        ...prev.margins,
        isAuto: true,
      },
      spacing: {
        ...prev.spacing,
        isAuto: true,
      },
    }));
  };

  // Photo size preset selection
  const handleSizePresetChange = (preset: PhotoPresetType) => {
    if (preset === '35x45') {
      setSettings((prev) => ({
        ...prev,
        photoSize: {
          preset: '35x45',
          width: 35,
          height: 45,
          unit: 'mm',
          widthMm: 35,
          heightMm: 45,
        },
      }));
    } else if (preset === '2x2') {
      setSettings((prev) => ({
        ...prev,
        photoSize: {
          preset: '2x2',
          width: 2,
          height: 2,
          unit: 'inch',
          widthMm: 50.8,
          heightMm: 50.8,
        },
      }));
    } else {
      // Custom size
      const currentResolved = resolvePhotoDimensionsMm(prevSettingsSize(settings.photoSize));
      setSettings((prev) => ({
        ...prev,
        photoSize: {
          preset: 'custom',
          width: currentResolved.widthMm,
          height: currentResolved.heightMm,
          unit: 'mm',
          widthMm: currentResolved.widthMm,
          heightMm: currentResolved.heightMm,
        },
      }));
    }
  };

  function prevSettingsSize(size: PhotoSizeConfig): PhotoSizeConfig {
    return size;
  }

  // Custom size dimension changes
  const handleCustomDimensionChange = (
    field: 'width' | 'height',
    value: number
  ) => {
    const validVal = isNaN(value) ? 0 : Math.max(0, value);
    setSettings((prev) => {
      const updated = {
        ...prev.photoSize,
        [field]: validVal,
      };
      const resolved = resolvePhotoDimensionsMm(updated);
      return {
        ...prev,
        photoSize: {
          ...updated,
          widthMm: resolved.widthMm,
          heightMm: resolved.heightMm,
        },
      };
    });
  };

  // Custom unit change (mm, inch, px)
  const handleCustomUnitChange = (unit: DimensionUnit) => {
    setSettings((prev) => {
      const updated = {
        ...prev.photoSize,
        unit,
      };
      const resolved = resolvePhotoDimensionsMm(updated);
      return {
        ...prev,
        photoSize: {
          ...updated,
          widthMm: resolved.widthMm,
          heightMm: resolved.heightMm,
        },
      };
    });
  };

  // Orientation toggle
  const handleOrientationChange = (orientation: 'portrait' | 'landscape') => {
    setSettings((prev) => ({
      ...prev,
      orientation,
    }));
  };

  // Copy count selection
  const handleCopyPresetSelect = (count: number) => {
    setIsCustomCopies(false);
    setSettings((prev) => ({
      ...prev,
      copies: count,
    }));
  };

  const handleCustomCopyChange = (value: number) => {
    const validCount = isNaN(value) ? 1 : Math.max(1, Math.min(60, value));
    setSettings((prev) => ({
      ...prev,
      copies: validCount,
    }));
  };

  // Margins change
  const handleMarginChange = (
    side: 'top' | 'bottom' | 'left' | 'right',
    value: number
  ) => {
    const val = isNaN(value) ? 0 : Math.max(0, value);
    setSettings((prev) => ({
      ...prev,
      margins: {
        ...prev.margins,
        isAuto: false, // switched to manual
        [side]: val,
      },
    }));
  };

  // Spacing change
  const handleSpacingChange = (
    dir: 'horizontal' | 'vertical',
    value: number
  ) => {
    const val = isNaN(value) ? 0 : Math.max(0, value);
    setSettings((prev) => ({
      ...prev,
      spacing: {
        ...prev.spacing,
        isAuto: false, // switched to manual
        [dir]: val,
      },
    }));
  };

  const handlePrint = () => {
    if (!gridResult.fits) {
      alert('Photos do not fit on A4 sheet. Please reduce copies or photo size before printing.');
      return;
    }
    window.print();
  };

  const handleExportPdf = async () => {
    if (!gridResult.fits) {
      setPdfErrorMessage("These photos cannot fit on one A4 sheet at the selected size. Reduce the number of copies or choose a smaller photo size.");
      return;
    }

    try {
      setIsExportingPdf(true);
      setPdfErrorMessage(null);
      setIsPdfModalOpen(true);
      setPdfModalStage(1);

      const photoToUse = onGenerateFreshPhoto
        ? await onGenerateFreshPhoto()
        : processedPhotoUrl;

      const result = await exportA4LayoutToPdf({
        processedPhotoUrl: photoToUse,
        settings,
        gridResult,
        filename: 'passport-printer.pdf',
        onProgress: (stage) => {
          setPdfModalStage(stage);
        },
      });

      setCachedPdfResult(result);
      setPdfModalStage('success');
      setPdfSuccessMessage('Your PDF is ready to print.');
      onPdfExported?.();
    } catch (err: any) {
      console.error('PDF generation error:', err);
      setPdfModalStage('error');
      setPdfErrorMessage("We couldn't generate the PDF. Please try again.");
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleDownloadAgain = () => {
    if (cachedPdfResult) {
      cachedPdfResult.download();
    } else {
      handleExportPdf();
    }
  };

  const handleSafeStartOver = () => {
    if (cachedPdfResult?.blobUrl) {
      URL.revokeObjectURL(cachedPdfResult.blobUrl);
    }
    setCachedPdfResult(null);
    setIsPdfModalOpen(false);
    onStartOver?.();
  };

  // Global Keyboard Shortcuts for A4 Layout (Ctrl+S / Cmd+S for PDF, Ctrl+P for Print, Esc for Back, A for Auto-Arrange)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInput =
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          activeEl.tagName === 'SELECT' ||
          (activeEl as HTMLElement).isContentEditable);

      if (isInput) return;

      // Ctrl+S or Cmd+S -> Download PDF
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleExportPdf();
        return;
      }

      // Ctrl+P or Cmd+P -> Browser Print
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        handlePrint();
        return;
      }

      // Escape -> Back to Adjust
      if (e.key === 'Escape') {
        e.preventDefault();
        onBackToAdjust();
        return;
      }

      // 'a' or 'A' -> Auto Arrange
      if (e.key.toLowerCase() === 'a' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        handleAutoArrange();
        return;
      }

      // '?' -> Open shortcuts modal
      if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setIsShortcutsOpen(true);
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleExportPdf, handlePrint, onBackToAdjust, handleAutoArrange]);

  const resolvedDimensions = resolvePhotoDimensionsMm(settings.photoSize);

  return (
    <div className="w-full max-w-6xl mx-auto space-y-4">
      {/* PDF Generation Loading Experience & Success Screen */}
      <PdfLoadingModal
        isOpen={isPdfModalOpen}
        stage={pdfModalStage}
        thumbnailUrl={processedPhotoUrl}
        copiesCount={settings.copies}
        errorMessage={pdfErrorMessage}
        onDownloadAgain={handleDownloadAgain}
        onStartOver={handleSafeStartOver}
        onClose={() => setIsPdfModalOpen(false)}
        onRetry={handleExportPdf}
      />

      {/* Keyboard Shortcuts Dialog */}
      <ShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />

      {/* Top Bar Actions (Hidden during print) */}
      <div className="no-print flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 sm:px-5 rounded-xl border border-slate-200/80 shadow-2xs">
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={onBackToAdjust}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 hover:text-slate-900 transition-colors cursor-pointer"
            title="Return to photo editor (Esc)"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Adjust</span>
          </button>

          {onStartOver && (
            <button
              type="button"
              onClick={handleSafeStartOver}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer"
              title="Start over with a new photo"
            >
              <RotateCcw className="w-4 h-4 text-slate-500" />
              <span>Start Over</span>
            </button>
          )}

          <span className="text-xs text-slate-500 hidden md:inline">
            A4 Print Layout · {settings.copies} copies · {resolvedDimensions.widthMm} × {resolvedDimensions.heightMm} mm
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsShortcutsOpen(true)}
            className="inline-flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs sm:text-sm font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
            title="View keyboard shortcuts"
          >
            <Keyboard className="w-3.5 h-3.5 text-slate-600" />
            <span className="hidden md:inline">Shortcuts</span>
          </button>

          <button
            type="button"
            onClick={handleAutoArrange}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-2xs transition-colors cursor-pointer"
            title="Automatically calculate best grid, spacing, and centered margins (A)"
          >
            <Sparkles className="w-4 h-4 text-blue-600" />
            <span>Auto Arrange</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            disabled={!gridResult.fits}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-2xs transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            title={`Print A4 sheet directly (${isMac ? 'Cmd+P' : 'Ctrl+P'})`}
          >
            <Printer className="w-4 h-4 text-slate-600" />
            <span>Print Sheet</span>
          </button>

          <button
            type="button"
            onClick={handleExportPdf}
            disabled={!gridResult.fits || isExportingPdf}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-medium bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-xs transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            title={`Download printable A4 PDF (${isMac ? 'Cmd+S' : 'Ctrl+S'})`}
          >
            {isExportingPdf ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <FileDown className="w-4 h-4" />
            )}
            <span>Download PDF</span>
            <kbd className="hidden lg:inline-block px-1.5 py-0.5 bg-blue-700/60 border border-blue-400/30 rounded text-[10px] font-mono text-blue-100 font-normal">
              {isMac ? '⌘S' : 'Ctrl+S'}
            </kbd>
          </button>
        </div>
      </div>

      {/* PDF Success & Print Instructions Notification */}
      {pdfSuccessMessage && (
        <div
          role="status"
          className="no-print p-4 bg-emerald-50 border-2 border-emerald-300 text-emerald-950 rounded-2xl flex items-start justify-between gap-3 shadow-2xs animate-in fade-in"
        >
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5">
              <Check className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-emerald-950">
                Your PDF is ready to print.
              </h4>
              <p className="text-xs sm:text-sm text-emerald-900 mt-1 font-medium leading-relaxed">
                Print at 100% / Actual Size. Do not use Fit to Page or automatic scaling if accurate photo dimensions are required.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setPdfSuccessMessage(null)}
            className="text-emerald-700 hover:text-emerald-950 text-xs font-semibold px-2.5 py-1 rounded hover:bg-emerald-100 transition-colors cursor-pointer shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* PDF Generation Error Banner */}
      {pdfErrorMessage && (
        <div
          role="alert"
          className="no-print p-4 bg-rose-50 border-2 border-rose-300 text-rose-950 rounded-2xl flex items-start justify-between gap-3 shadow-2xs animate-in fade-in"
        >
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span className="text-xs sm:text-sm font-semibold">
              {pdfErrorMessage}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setPdfErrorMessage(null)}
            className="text-rose-700 hover:text-rose-950 text-xs font-semibold px-2.5 py-1 rounded hover:bg-rose-100 transition-colors cursor-pointer shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Fit Validation Warning Banner if photos cannot fit */}
      {!gridResult.fits && (
        <div
          role="alert"
          className="no-print p-4 rounded-xl bg-amber-50 border-2 border-amber-300 text-amber-950 flex items-start gap-3 shadow-xs"
        >
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-sm font-bold text-amber-950">Fit Validation Notice</h4>
            <p className="text-xs sm:text-sm text-amber-900 mt-1 font-medium">
              These photos cannot fit on one A4 sheet at the selected size. Reduce the number of copies or choose a smaller photo size.
            </p>
            <div className="mt-2.5 flex items-center gap-2">
              <button
                type="button"
                onClick={handleAutoArrange}
                className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-md shadow-2xs cursor-pointer"
              >
                Auto Arrange
              </button>
              <button
                type="button"
                onClick={() => setSettings((prev) => ({ ...prev, copies: 6 }))}
                className="px-3 py-1 bg-white border border-amber-300 hover:bg-amber-100 text-amber-900 text-xs font-medium rounded-md cursor-pointer"
              >
                Reset to 6 Copies
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Responsive Grid Layout */}
      {/* Desktop: LEFT: Live Realistic A4 Preview, RIGHT: Layout Controls */}
      {/* Mobile: Stacked vertically */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Live Realistic A4 Preview (lg:col-span-7) */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-100/70 border border-blue-200/60 px-2 py-0.5 rounded-md shadow-2xs">
                Step 6
              </span>
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Sheet Preview
              </h3>
            </div>
            <span className="text-xs text-slate-500 font-mono">
              {gridResult.paperWidthMm} × {gridResult.paperHeightMm} mm ({settings.orientation})
            </span>
          </div>

          <div className="bg-slate-800 rounded-2xl p-4 sm:p-8 flex items-center justify-center min-h-[480px] sm:min-h-[620px] shadow-sm overflow-hidden">
            {/* The True A4 Sheet Paper Container */}
            <div
              id="printable-sheet"
              className="relative bg-white shadow-2xl select-none overflow-hidden transition-all duration-200"
              style={{
                width: '100%',
                maxWidth: settings.orientation === 'landscape' ? '560px' : '420px',
                aspectRatio: `${gridResult.paperWidthMm} / ${gridResult.paperHeightMm}`,
              }}
            >
              {/* Margins Guideline Indicator */}
              <div
                className="absolute border border-dashed border-slate-300/60 pointer-events-none"
                style={{
                  left: `${(gridResult.actualMargins.left / gridResult.paperWidthMm) * 100}%`,
                  right: `${(gridResult.actualMargins.right / gridResult.paperWidthMm) * 100}%`,
                  top: `${(gridResult.actualMargins.top / gridResult.paperHeightMm) * 100}%`,
                  bottom: `${(gridResult.actualMargins.bottom / gridResult.paperHeightMm) * 100}%`,
                }}
              />

              {/* Photos Rendered on A4 Sheet */}
              {gridResult.fits &&
                gridResult.slots.map((slot) => {
                  const leftPercent = (slot.xMm / gridResult.paperWidthMm) * 100;
                  const topPercent = (slot.yMm / gridResult.paperHeightMm) * 100;
                  const widthPercent = (slot.widthMm / gridResult.paperWidthMm) * 100;
                  const heightPercent = (slot.heightMm / gridResult.paperHeightMm) * 100;

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
                      {/* Photo Image with Black Border */}
                      <div
                        className="w-full h-full relative"
                        style={{
                          // Black border requirement
                          boxSizing: 'border-box',
                          border: settings.border.enabled
                            ? `${settings.border.widthPx}px solid ${settings.border.color}`
                            : 'none',
                        }}
                      >
                        <img
                          src={processedPhotoUrl}
                          alt={`Passport copy ${slot.index + 1}`}
                          className="w-full h-full object-cover block select-none"
                          draggable={false}
                        />
                      </div>

                      {/* Tooltip on hover */}
                      <div className="absolute -top-5 left-0 bg-slate-900 text-white text-[9px] px-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20 font-mono">
                        #{slot.index + 1} ({slot.widthMm}×{slot.heightMm}mm)
                      </div>
                    </div>
                  );
                })}

              {/* When photos do NOT fit on sheet, show empty state inside sheet */}
              {!gridResult.fits && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-slate-50/80">
                  <AlertCircle className="w-10 h-10 text-amber-500 mb-2" />
                  <p className="text-xs font-semibold text-slate-700 max-w-xs">
                    Cannot fit {settings.copies} copies of {resolvedDimensions.widthMm}×{resolvedDimensions.heightMm}mm on A4
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Try reducing copies or switching orientation
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Quick status bar underneath preview */}
          <div className="no-print flex flex-wrap items-center justify-between text-xs text-slate-500 px-1 gap-2">
            <span>
              A4 Page: <strong>{gridResult.paperWidthMm} × {gridResult.paperHeightMm} mm</strong> ({settings.orientation})
            </span>
            {gridResult.fits && (
              <span>
                Grid: <strong>{gridResult.cols} × {gridResult.rows}</strong> ({settings.copies} copies)
              </span>
            )}
            <span>
              Photo: <strong>{resolvedDimensions.widthMm} × {resolvedDimensions.heightMm} mm</strong>
            </span>
          </div>
        </div>

        {/* RIGHT COLUMN: Layout Controls (lg:col-span-5) */}
        <div className="no-print lg:col-span-5 space-y-4">
          {/* Step 3: Photo Size Card */}
          <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-100/70 border border-blue-200/60 px-2 py-0.5 rounded-md shadow-2xs">
                  Step 3
                </span>
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Choose Photo Size
                </label>
                <HelperTooltip
                  title="Photo Dimensions"
                  content="Passport photos require exact physical dimensions. 35×45 mm is the international ICAO standard (EU, UK, Canada, Australia, Schengen). 2×2 inch (50.8×50.8 mm) is strictly required for US Passports & India Visas."
                  optimalTip="Always confirm your specific consular requirements before printing."
                />
              </div>
              <span className="text-xs text-blue-600 font-medium">
                {resolvedDimensions.widthMm} × {resolvedDimensions.heightMm} mm
              </span>
            </div>

            {/* Presets */}
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleSizePresetChange('35x45')}
                className={`py-2 px-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer text-center ${
                  settings.photoSize.preset === '35x45'
                    ? 'border-blue-600 bg-blue-50 text-blue-900 ring-1 ring-blue-600/30'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                35 × 45 mm
              </button>

              <button
                type="button"
                onClick={() => handleSizePresetChange('2x2')}
                className={`py-2 px-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer text-center ${
                  settings.photoSize.preset === '2x2'
                    ? 'border-blue-600 bg-blue-50 text-blue-900 ring-1 ring-blue-600/30'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                2 × 2 inch
              </button>

              <button
                type="button"
                onClick={() => handleSizePresetChange('custom')}
                className={`py-2 px-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer text-center ${
                  settings.photoSize.preset === 'custom'
                    ? 'border-blue-600 bg-blue-50 text-blue-900 ring-1 ring-blue-600/30'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                Custom Size
              </button>
            </div>

            {/* Custom Dimension Inputs (Shown when Custom is selected) */}
            {settings.photoSize.preset === 'custom' && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2.5 pt-3">
                <div className="grid grid-cols-3 gap-2 items-center">
                  <div>
                    <label className="text-[11px] font-medium text-slate-600 block mb-1">
                      Width
                    </label>
                    <input
                      type="number"
                      min="5"
                      max="200"
                      step="0.5"
                      value={settings.photoSize.width}
                      onChange={(e) =>
                        handleCustomDimensionChange('width', parseFloat(e.target.value))
                      }
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-slate-600 block mb-1">
                      Height
                    </label>
                    <input
                      type="number"
                      min="5"
                      max="250"
                      step="0.5"
                      value={settings.photoSize.height}
                      onChange={(e) =>
                        handleCustomDimensionChange('height', parseFloat(e.target.value))
                      }
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-slate-600 block mb-1">
                      Unit
                    </label>
                    <select
                      value={settings.photoSize.unit}
                      onChange={(e) =>
                        handleCustomUnitChange(e.target.value as DimensionUnit)
                      }
                      className="w-full px-2 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                    >
                      <option value="mm">mm</option>
                      <option value="inch">inch</option>
                      <option value="px">px (300DPI)</option>
                    </select>
                  </div>
                </div>

                <div className="text-[11px] text-slate-500 flex items-center justify-between">
                  <span>Physical size:</span>
                  <span className="font-mono font-medium text-slate-800">
                    {resolvedDimensions.widthMm} × {resolvedDimensions.heightMm} mm
                  </span>
                </div>
              </div>
            )}

            <p className="text-[11px] text-slate-400">
              Calibrated to exact physical millimeters for true-to-scale output.
            </p>
          </div>

          {/* Step 4: Number of Copies Card */}
          <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-100/70 border border-blue-200/60 px-2 py-0.5 rounded-md shadow-2xs">
                  Step 4
                </span>
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Number of Copies
                </label>
                <HelperTooltip
                  title="Photo Copies & Smart Grid"
                  content="The Smart Grid automatically determines the best column × row packing (e.g. 2×3 for 6 copies, 3×4 for 12 copies). If the requested count exceeds the physical printable area of the A4 page, fit validation will alert you."
                  optimalTip="Click 'Auto Arrange' anytime to re-center the copies."
                />
              </div>
              <span className="text-xs font-bold text-slate-900 font-mono tabular-nums">
                {settings.copies} {settings.copies === 1 ? 'copy' : 'copies'}
              </span>
            </div>

            {/* Presets: 1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20, Custom */}
            <div className="flex flex-wrap gap-1.5">
              {COPY_PRESETS.map((count) => {
                const isSelected = !isCustomCopies && settings.copies === count;
                return (
                  <button
                    key={count}
                    type="button"
                    onClick={() => handleCopyPresetSelect(count)}
                    className={`min-w-8 h-8 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-center border ${
                      isSelected
                        ? 'border-blue-600 bg-blue-600 text-white shadow-2xs'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {count}
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => setIsCustomCopies(true)}
                className={`h-8 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
                  isCustomCopies
                    ? 'border-blue-600 bg-blue-50 text-blue-900 ring-1 ring-blue-600/30'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                Custom
              </button>
            </div>

            {/* Custom Copies Input */}
            {isCustomCopies && (
              <div className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200/80">
                <span className="text-xs font-medium text-slate-600">Enter copies:</span>
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={settings.copies}
                  onChange={(e) => handleCustomCopyChange(parseInt(e.target.value, 10))}
                  className="w-20 px-2.5 py-1 text-xs font-mono font-bold bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                />
                <span className="text-xs text-slate-400">(Max 60)</span>
              </div>
            )}
          </div>

          {/* Step 5: Arrange A4 Sheet Group */}
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-100/70 border border-blue-200/60 px-2 py-0.5 rounded-md shadow-2xs">
                  Step 5
                </span>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Arrange A4 Sheet
                </h4>
              </div>
              <button
                type="button"
                onClick={handleAutoArrange}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Auto Arrange
              </button>
            </div>

            {/* A4 Orientation Card */}
            <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    A4 Orientation
                  </label>
                  <HelperTooltip
                    title="Page Orientation"
                    content="Portrait (210×297 mm) allows vertical 35×45 mm photos to pack efficiently into up to 20 copies per sheet. Landscape (297×210 mm) is best suited for 2×2 inch square photos or wider custom grids."
                    optimalTip="Portrait is optimal for 35×45 mm; Landscape works best for 2×2 in."
                  />
                </div>
                <span className="text-xs text-slate-400 font-mono">
                  {settings.orientation === 'portrait' ? '210 × 297 mm' : '297 × 210 mm'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleOrientationChange('portrait')}
                  className={`py-2.5 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    settings.orientation === 'portrait'
                      ? 'border-blue-600 bg-blue-50 text-blue-900 ring-1 ring-blue-600/30'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="w-3.5 h-4.5 border-2 border-current rounded-xs" />
                  <span>Portrait</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOrientationChange('landscape')}
                  className={`py-2.5 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    settings.orientation === 'landscape'
                      ? 'border-blue-600 bg-blue-50 text-blue-900 ring-1 ring-blue-600/30'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="w-4.5 h-3.5 border-2 border-current rounded-xs" />
                  <span>Landscape</span>
                </button>
              </div>

              <p className="text-[11px] text-slate-400">
                Portrait maximizes packing capacity for 35 × 45 mm photos.
              </p>
            </div>
          </div>

          {/* 4. Margins Card */}
          <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Margins (mm)
                </label>
                <HelperTooltip
                  title="Printer Feed Margins"
                  content="Consumer inkjet and laser printers have mechanical paper-feed rollers that require at least 5–10 mm of non-printable border along page edges. Setting margins under 5 mm can cause your printer to clip outer photos."
                  optimalTip="Keep margins ≥ 10 mm. 'Auto (Centered)' balances all 4 borders evenly."
                />
              </div>
              <button
                type="button"
                onClick={() =>
                  setSettings((prev) => ({
                    ...prev,
                    margins: { ...prev.margins, isAuto: !prev.margins.isAuto },
                  }))
                }
                className="text-xs text-blue-600 hover:text-blue-800 font-medium cursor-pointer"
              >
                {settings.margins.isAuto ? 'Auto (Centered)' : 'Set to Auto'}
              </button>
            </div>

            <div className="grid grid-cols-4 gap-2">
              <div>
                <span className="text-[10px] text-slate-500 block mb-1">Top</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={
                    settings.margins.isAuto
                      ? gridResult.actualMargins.top
                      : settings.margins.top
                  }
                  onChange={(e) =>
                    handleMarginChange('top', parseFloat(e.target.value))
                  }
                  className="w-full px-2 py-1 text-xs font-mono bg-white border border-slate-200 rounded-lg text-center"
                />
              </div>

              <div>
                <span className="text-[10px] text-slate-500 block mb-1">Bottom</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={
                    settings.margins.isAuto
                      ? gridResult.actualMargins.bottom
                      : settings.margins.bottom
                  }
                  onChange={(e) =>
                    handleMarginChange('bottom', parseFloat(e.target.value))
                  }
                  className="w-full px-2 py-1 text-xs font-mono bg-white border border-slate-200 rounded-lg text-center"
                />
              </div>

              <div>
                <span className="text-[10px] text-slate-500 block mb-1">Left</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={
                    settings.margins.isAuto
                      ? gridResult.actualMargins.left
                      : settings.margins.left
                  }
                  onChange={(e) =>
                    handleMarginChange('left', parseFloat(e.target.value))
                  }
                  className="w-full px-2 py-1 text-xs font-mono bg-white border border-slate-200 rounded-lg text-center"
                />
              </div>

              <div>
                <span className="text-[10px] text-slate-500 block mb-1">Right</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={
                    settings.margins.isAuto
                      ? gridResult.actualMargins.right
                      : settings.margins.right
                  }
                  onChange={(e) =>
                    handleMarginChange('right', parseFloat(e.target.value))
                  }
                  className="w-full px-2 py-1 text-xs font-mono bg-white border border-slate-200 rounded-lg text-center"
                />
              </div>
            </div>

            <p className="text-[11px] text-slate-400">
              Recommended: 10–15 mm. Home printers cannot print within 5 mm of paper edges.
            </p>
          </div>

          {/* 5. Spacing Card */}
          <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Spacing (mm)
                </label>
                <HelperTooltip
                  title="Inter-Photo Spacing"
                  content="The physical gap between photos on the A4 sheet. A 4–5 mm gap provides clean scissor cutting clearance without nicking adjacent photos. A 0 mm gap places photos edge-to-edge for single-cut paper trimmers."
                  optimalTip="4–5 mm is optimal for scissor trimming; 0 mm for guillotine trimmers."
                />
              </div>
              <button
                type="button"
                onClick={() =>
                  setSettings((prev) => ({
                    ...prev,
                    spacing: { ...prev.spacing, isAuto: !prev.spacing.isAuto },
                  }))
                }
                className="text-xs text-blue-600 hover:text-blue-800 font-medium cursor-pointer"
              >
                {settings.spacing.isAuto ? 'Auto (5 mm)' : 'Set to Auto'}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-[11px] text-slate-500 block mb-1">Horizontal</span>
                <input
                  type="number"
                  min="0"
                  max="50"
                  value={
                    settings.spacing.isAuto
                      ? gridResult.actualSpacing.horizontal
                      : settings.spacing.horizontal
                  }
                  onChange={(e) =>
                    handleSpacingChange('horizontal', parseFloat(e.target.value))
                  }
                  className="w-full px-2.5 py-1.5 text-xs font-mono bg-white border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <span className="text-[11px] text-slate-500 block mb-1">Vertical</span>
                <input
                  type="number"
                  min="0"
                  max="50"
                  value={
                    settings.spacing.isAuto
                      ? gridResult.actualSpacing.vertical
                      : settings.spacing.vertical
                  }
                  onChange={(e) =>
                    handleSpacingChange('vertical', parseFloat(e.target.value))
                  }
                  className="w-full px-2.5 py-1.5 text-xs font-mono bg-white border border-slate-200 rounded-lg"
                />
              </div>
            </div>

            <p className="text-[11px] text-slate-400">
              Recommended: 4–5 mm clearance for clean, straight scissor trimming.
            </p>
          </div>

          {/* 6. Black Border Card */}
          <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 block">
                    Black Border
                  </label>
                  <HelperTooltip
                    title="Cutting Outline Border"
                    content="A thin 1 px (0.26 mm) black border clearly distinguishes each photo from white paper, provides official straight cutting guides, and is explicitly required by many visa and passport authorities."
                    optimalTip="Keep 1 px border enabled for official passport submission."
                  />
                </div>
                <span className="text-[11px] text-slate-400">
                  Crisp outline around every photo copy
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setSettings((prev) => ({
                      ...prev,
                      border: {
                        ...prev.border,
                        enabled: !prev.border.enabled,
                      },
                    }))
                  }
                  role="switch"
                  aria-checked={settings.border.enabled}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500/30 ${
                    settings.border.enabled ? 'bg-blue-600' : 'bg-slate-200'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                      settings.border.enabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            {settings.border.enabled && (
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                <span>Border Width:</span>
                <div className="flex items-center gap-1.5">
                  {[1, 2].map((w) => (
                    <button
                      key={w}
                      type="button"
                      onClick={() =>
                        setSettings((prev) => ({
                          ...prev,
                          border: { ...prev.border, widthPx: w },
                        }))
                      }
                      className={`px-2.5 py-0.5 rounded border text-xs font-mono cursor-pointer ${
                        settings.border.widthPx === w
                          ? 'border-blue-600 bg-blue-50 text-blue-900 font-bold'
                          : 'border-slate-200 bg-white text-slate-700'
                      }`}
                    >
                      {w}px
                    </button>
                  ))}
                  <span className="w-3 h-3 rounded-full bg-black ml-1 inline-block" title="Black" />
                </div>
              </div>
            )}
          </div>

          {/* Optimal Print Setup Advice Box */}
          <div className="p-4 bg-slate-50/90 rounded-2xl border border-slate-200/80 space-y-2 text-xs text-slate-600">
            <h4 className="font-semibold text-slate-800 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-blue-600" />
              Quick Print Checklist
            </h4>
            <ul className="space-y-1 text-[11px] text-slate-500 list-disc list-inside">
              <li>Print setting: Set scale to <strong>100%</strong> or <strong>&ldquo;Actual Size&rdquo;</strong> (never &ldquo;Fit&rdquo;).</li>
              <li>Paper: Use high-resolution glossy or semi-gloss photo paper.</li>
              <li>Trimming: Cut along the black borders and corner tick guides.</li>
            </ul>
          </div>

          {/* Step 7: Download PDF Action Card */}
          <div className="p-4 bg-gradient-to-b from-blue-50/70 to-blue-100/40 rounded-2xl border border-blue-200/80 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-white bg-blue-600 px-2 py-0.5 rounded-md shadow-2xs">
                  Step 7
                </span>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Download PDF
                </h4>
              </div>
              <span className="text-xs font-mono text-blue-700 font-medium">
                {settings.copies} {settings.copies === 1 ? 'copy' : 'copies'}
              </span>
            </div>

            <button
              type="button"
              onClick={handleExportPdf}
              disabled={!gridResult.fits || isExportingPdf}
              className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <FileDown className="w-4 h-4" />
              <span>Download Print-Ready PDF</span>
              <kbd className="hidden sm:inline-block px-1.5 py-0.5 bg-blue-800/60 rounded text-[10px] font-mono text-blue-100">
                {isMac ? '⌘S' : 'Ctrl+S'}
              </kbd>
            </button>

            <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500 pt-1 text-center">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Your photo is processed locally in your browser and is not uploaded to a server.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
