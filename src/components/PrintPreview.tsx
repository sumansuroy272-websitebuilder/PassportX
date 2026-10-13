import React, { useState, useMemo } from 'react';
import {
  Printer,
  Download,
  ArrowLeft,
  Scissors,
  Maximize2,
  FileText,
  Sliders,
  Check,
  Info,
  Grid,
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
} from '../utils/printLayout';
import { loadImageElement } from '../utils/imageProcessing';

interface PrintPreviewProps {
  croppedPhotoDataUrl: string;
  aspectPreset: AspectRatioPreset;
  onBackToEditor: () => void;
}

export const PrintPreview: React.FC<PrintPreviewProps> = ({
  croppedPhotoDataUrl,
  aspectPreset,
  onBackToEditor,
}) => {
  const [config, setConfig] = useState<PrintLayoutConfig>({
    ...DEFAULT_PRINT_CONFIG,
  });
  const [isGeneratingDownload, setIsGeneratingDownload] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  // Compute layout grid
  const layout = useMemo(() => {
    return calculatePrintLayout({
      config,
      photoWidthMm: aspectPreset.widthMm,
      photoHeightMm: aspectPreset.heightMm,
    });
  }, [config, aspectPreset]);

  // Handle Paper Size Change
  const handlePaperSizeChange = (paperSize: PaperSize) => {
    setConfig((prev) => ({
      ...prev,
      paperSize,
    }));
  };

  // Handle Orientation Change
  const handleOrientationToggle = () => {
    setConfig((prev) => ({
      ...prev,
      orientation: prev.orientation === 'portrait' ? 'landscape' : 'portrait',
    }));
  };

  // Handle Photo Count Adjustments
  const handleCountChange = (newCount: number) => {
    setConfig((prev) => ({
      ...prev,
      photoCount: Math.max(1, Math.min(newCount, layout.maxCapacity)),
    }));
  };

  // Quick preset counts
  const handleQuickCount = (count: number) => {
    handleCountChange(count);
  };

  const handleFillPage = () => {
    handleCountChange(layout.maxCapacity);
  };

  // Browser Print Trigger
  const handlePrint = () => {
    window.print();
  };

  // Download High-Res Sheet Image
  const handleDownloadSheet = async () => {
    try {
      setIsGeneratingDownload(true);
      const photoImg = await loadImageElement(croppedPhotoDataUrl);

      const sheetDataUrl = await renderPrintSheetCanvas({
        photoImage: photoImg,
        layout,
        showCutLines: config.showCutLines,
        targetDpi: 300, // Standard 300 DPI print quality
      });

      const link = document.createElement('a');
      link.href = sheetDataUrl;
      link.download = `passport-print-sheet-${config.paperSize.id}-${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 4000);
    } catch (err) {
      console.error('Failed to generate print sheet:', err);
      alert('Could not render print sheet. Please try again.');
    } finally {
      setIsGeneratingDownload(false);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-4">
      {/* Top Bar Navigation & Actions (Hidden during browser print) */}
      <div className="no-print flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 sm:px-5 rounded-xl border border-slate-200/80 shadow-2xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackToEditor}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 hover:text-slate-900 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Editor</span>
          </button>

          <span className="text-xs text-slate-500 hidden sm:inline">
            Print Sheet Preview · {layout.activeCount} photos on {config.paperSize.name}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleDownloadSheet}
            disabled={isGeneratingDownload}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
            title="Download print-ready 300 DPI sheet image for kiosk/USB"
          >
            {isGeneratingDownload ? (
              <div className="w-4 h-4 border-2 border-slate-600 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Download className="w-4 h-4 text-slate-600" />
            )}
            <span>Download Sheet (300 DPI)</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors cursor-pointer"
            title="Open browser print dialog"
          >
            <Printer className="w-4 h-4" />
            <span>Print Sheet</span>
          </button>
        </div>
      </div>

      {downloadSuccess && (
        <div className="no-print p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm rounded-lg flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>High-resolution 300 DPI print sheet downloaded successfully!</span>
        </div>
      )}

      {/* Main 2-Column Responsive Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: True-to-Scale Sheet Preview (lg:col-span-7) */}
        <div className="lg:col-span-7 space-y-3">
          {/* Printable Sheet Viewport */}
          <div className="bg-slate-800 rounded-2xl p-4 sm:p-8 flex items-center justify-center overflow-hidden min-h-[460px] sm:min-h-[560px] shadow-sm">
            {/* The True-to-Scale Sheet Paper Container */}
            <div
              id="printable-sheet"
              className="relative bg-white shadow-2xl transition-all duration-200 select-none overflow-hidden"
              style={{
                width: '100%',
                maxWidth: config.orientation === 'landscape' ? '540px' : '400px',
                aspectRatio: `${layout.paperWidthMm} / ${layout.paperHeightMm}`,
              }}
            >
              {/* Paper margin boundary indicator */}
              <div
                className="absolute border border-slate-200/50 pointer-events-none"
                style={{
                  top: `${(config.marginMm / layout.paperHeightMm) * 100}%`,
                  bottom: `${(config.marginMm / layout.paperHeightMm) * 100}%`,
                  left: `${(config.marginMm / layout.paperWidthMm) * 100}%`,
                  right: `${(config.marginMm / layout.paperWidthMm) * 100}%`,
                }}
              />

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
                    {/* The Passport Photo */}
                    <img
                      src={croppedPhotoDataUrl}
                      alt={`Passport photo ${slot.index + 1}`}
                      className="w-full h-full object-cover block"
                    />

                    {/* Optional Scissor Cutting Lines / Borders */}
                    {config.showCutLines && (
                      <div className="absolute inset-0 border border-dashed border-slate-400/80 pointer-events-none">
                        {/* Corner ticks */}
                        <div className="absolute -top-1 -left-1 w-2 h-2 border-t border-l border-slate-600 pointer-events-none" />
                        <div className="absolute -top-1 -right-1 w-2 h-2 border-t border-r border-slate-600 pointer-events-none" />
                        <div className="absolute -bottom-1 -left-1 w-2 h-2 border-b border-l border-slate-600 pointer-events-none" />
                        <div className="absolute -bottom-1 -right-1 w-2 h-2 border-b border-r border-slate-600 pointer-events-none" />
                      </div>
                    )}

                    {/* Small number badge on hover */}
                    <div className="absolute bottom-0.5 right-0.5 bg-slate-900/70 text-white text-[9px] px-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none font-mono">
                      #{slot.index + 1}
                    </div>
                  </div>
                );
              })}

              {/* Faint footer label on the sheet */}
              <div
                className="absolute bottom-1 left-0 right-0 text-center text-[9px] text-slate-400 font-sans pointer-events-none px-2 truncate"
                style={{
                  fontSize: 'clamp(7px, 1.2cqw, 10px)',
                }}
              >
                PassportX · {aspectPreset.name} ({layout.activeCount} photos) · Print at 100% Scale
              </div>
            </div>
          </div>

          {/* Quick note underneath sheet */}
          <div className="no-print flex items-center justify-between text-xs text-slate-500 px-1">
            <span>
              Sheet: <strong>{config.paperSize.name}</strong> ({layout.paperWidthMm} × {layout.paperHeightMm} mm)
            </span>
            <span>
              Scale: <strong>100% (Actual Size)</strong>
            </span>
          </div>
        </div>

        {/* RIGHT COLUMN: Print Layout Controls (lg:col-span-5) */}
        <div className="no-print lg:col-span-5 space-y-4">
          {/* Paper Size Card */}
          <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Paper Size
              </label>
              <button
                type="button"
                onClick={handleOrientationToggle}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium cursor-pointer capitalize"
              >
                Switch to {config.orientation === 'portrait' ? 'Landscape' : 'Portrait'}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {PAPER_SIZES.map((paper) => {
                const isSelected = config.paperSize.id === paper.id;
                return (
                  <button
                    key={paper.id}
                    type="button"
                    onClick={() => handlePaperSizeChange(paper)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/50 ring-1 ring-blue-600/30'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="text-xs font-bold text-slate-900 flex items-center justify-between">
                      <span>{paper.name}</span>
                      {isSelected && (
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-600 inline-block" />
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1 line-clamp-1">
                      {paper.description}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Photo Duplication & Count Card */}
          <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Number of Photos
              </h3>
              <span className="text-xs text-slate-500 tabular-nums">
                Capacity: <strong>{layout.activeCount}</strong> / {layout.maxCapacity} max
              </span>
            </div>

            {/* Stepper Control */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleCountChange(config.photoCount - 1)}
                disabled={config.photoCount <= 1}
                aria-label="Decrease photo count"
                className="w-10 h-10 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center text-slate-700 transition-colors shadow-2xs cursor-pointer font-bold text-lg"
              >
                -
              </button>

              <div className="flex-1 text-center bg-slate-50 py-2 rounded-lg border border-slate-200/80">
                <span className="text-lg font-bold font-mono text-slate-900 tabular-nums">
                  {layout.activeCount}
                </span>
                <span className="text-xs text-slate-500 ml-1.5">
                  photo{layout.activeCount > 1 ? 's' : ''}
                </span>
              </div>

              <button
                type="button"
                onClick={() => handleCountChange(config.photoCount + 1)}
                disabled={config.photoCount >= layout.maxCapacity}
                aria-label="Increase photo count"
                className="w-10 h-10 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center text-slate-700 transition-colors shadow-2xs cursor-pointer font-bold text-lg"
              >
                +
              </button>
            </div>

            {/* Quick Count Presets */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {[2, 4, 6, 8].map((count) => {
                if (count > layout.maxCapacity) return null;
                const isCurrent = layout.activeCount === count;
                return (
                  <button
                    key={count}
                    type="button"
                    onClick={() => handleQuickCount(count)}
                    className={`px-3 py-1 text-xs font-medium rounded-md border transition-colors cursor-pointer ${
                      isCurrent
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {count}
                  </button>
                );
              })}

              <button
                type="button"
                onClick={handleFillPage}
                className={`px-3 py-1 text-xs font-medium rounded-md border transition-colors cursor-pointer ml-auto ${
                  layout.activeCount === layout.maxCapacity
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                }`}
              >
                Fill Page ({layout.maxCapacity})
              </button>
            </div>
          </div>

          {/* Spacing & Cutting Marks Card */}
          <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 pb-1 border-b border-slate-100">
              Spacing &amp; Cut Guides
            </h3>

            {/* Photo Spacing Slider */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-slate-700">
                <span className="font-medium">Spacing between photos</span>
                <span className="font-mono text-slate-500 tabular-nums">
                  {config.spacingMm} mm
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="12"
                step="1"
                value={config.spacingMm}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    spacingMm: parseInt(e.target.value, 10),
                  }))
                }
                aria-label="Spacing between photos slider"
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>0 mm (Touching)</span>
                <span>4 mm (Recommended)</span>
                <span>12 mm (Spaced)</span>
              </div>
            </div>

            {/* Cut Lines Toggle */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-xs font-medium text-slate-700 flex items-center gap-1.5">
                  <Scissors className="w-3.5 h-3.5 text-slate-600" />
                  Cutting Guidelines
                </span>
                <span className="text-[11px] text-slate-400 block">
                  Dotted border lines for easy trimming
                </span>
              </div>

              <button
                type="button"
                onClick={() =>
                  setConfig((prev) => ({
                    ...prev,
                    showCutLines: !prev.showCutLines,
                  }))
                }
                role="switch"
                aria-checked={config.showCutLines}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500/30 ${
                  config.showCutLines ? 'bg-blue-600' : 'bg-slate-200'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                    config.showCutLines ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Printing Instructions Callout */}
          <div className="p-4 bg-amber-50/80 rounded-2xl border border-amber-200/80 text-amber-900 space-y-2">
            <h4 className="text-xs font-semibold flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-amber-700" />
              Crucial Printing Tips
            </h4>
            <ul className="text-xs text-amber-800 space-y-1 list-disc list-inside">
              <li>In your printer settings, set <strong>Scale: 100%</strong> or <strong>Actual Size</strong>.</li>
              <li>Do <strong>NOT</strong> choose &ldquo;Fit to printable area&rdquo; or &ldquo;Shrink to fit&rdquo;.</li>
              <li>Use photo paper or high-density glossy paper for best passport acceptance.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export { PrintPreviewModal } from './PrintPreviewModal';
export type { PrintPreviewModalProps } from './PrintPreviewModal';
