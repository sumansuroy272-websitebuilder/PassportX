import React, { useEffect, useState } from 'react';
import { Check, Download, RotateCcw, X, AlertCircle, FileText, Printer } from 'lucide-react';

export type PdfGenerationStage = 1 | 2 | 3 | 4 | 'success' | 'error';

interface PdfLoadingModalProps {
  isOpen: boolean;
  stage: PdfGenerationStage;
  thumbnailUrl?: string | null;
  copiesCount?: number;
  errorMessage?: string | null;
  onDownloadAgain?: () => void;
  onStartOver?: () => void;
  onClose?: () => void;
  onRetry?: () => void;
}

export const PdfLoadingModal: React.FC<PdfLoadingModalProps> = ({
  isOpen,
  stage,
  thumbnailUrl,
  copiesCount = 6,
  errorMessage,
  onDownloadAgain,
  onStartOver,
  onClose,
  onRetry,
}) => {
  // Render grid slots for the mini A4 preview (capped between 4 and 12 for the animation)
  const displaySlotsCount = Math.min(Math.max(copiesCount, 4), 12);
  const slots = Array.from({ length: displaySlotsCount }, (_, i) => i);

  if (!isOpen) return null;

  const isSuccess = stage === 'success';
  const isError = stage === 'error';
  const isLoading = !isSuccess && !isError;

  // Stage message mappings
  let stageTitle = 'Preparing your photo...';
  let stageProgress = 25;

  if (stage === 1) {
    stageTitle = 'Preparing your photo...';
    stageProgress = 25;
  } else if (stage === 2) {
    stageTitle = 'Arranging your A4 sheet...';
    stageProgress = 50;
  } else if (stage === 3) {
    stageTitle = 'Generating print-ready PDF...';
    stageProgress = 75;
  } else if (stage === 4) {
    stageTitle = 'Finalizing your document...';
    stageProgress = 95;
  } else if (isSuccess) {
    stageTitle = 'Your PDF is ready.';
    stageProgress = 100;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="pdf-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div
        className="w-full max-w-sm sm:max-w-md bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 sm:p-7 text-slate-800 space-y-5 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button (available when done or on error) */}
        {!isLoading && onClose && (
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Central Visual: Mini A4 Paper Animation */}
        <div className="flex justify-center pt-1">
          <div className="relative w-32 h-[180px] bg-white rounded-sm border border-slate-300 shadow-md flex flex-col p-2.5 overflow-hidden transition-all duration-300">
            {/* Header notch line representing physical page */}
            <div className="w-full border-b border-dashed border-slate-200 pb-1 mb-1.5 flex items-center justify-between">
              <span className="text-[7px] font-mono text-slate-300 uppercase tracking-widest">
                A4 · 210×297mm
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-slate-200" />
            </div>

            {/* Grid of Mini Photo Placeholders */}
            <div className="grid grid-cols-2 gap-1.5 flex-1 content-center">
              {slots.slice(0, 6).map((slotIdx) => {
                const isFilled = (stage === 2 && slotIdx < 3) || (typeof stage === 'number' && stage >= 3) || isSuccess;

                return (
                  <div
                    key={slotIdx}
                    className={`aspect-[35/45] rounded-xs border transition-all duration-300 overflow-hidden relative ${
                      isFilled
                        ? 'border-slate-800 bg-slate-100'
                        : 'border-dashed border-slate-300 bg-slate-50'
                    }`}
                  >
                    {isFilled && thumbnailUrl ? (
                      <img
                        src={thumbnailUrl}
                        alt=""
                        className="w-full h-full object-cover select-none"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <div className="w-2.5 h-2.5 rounded-full bg-slate-200 animate-pulse" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Scanning Line Animation during stages 2, 3, 4 */}
            {isLoading && (
              <div
                className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-blue-500 to-transparent shadow-[0_0_8px_rgba(59,130,246,0.9)] animate-bounce"
                style={{
                  animationDuration: '1.4s',
                  animationIterationCount: 'infinite',
                }}
              />
            )}

            {/* Success Overlay Checkmark on A4 Paper */}
            {isSuccess && (
              <div className="absolute inset-0 bg-emerald-600/10 backdrop-blur-[0.5px] flex items-center justify-center">
                <div className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-lg transform animate-in zoom-in-50 duration-200">
                  <Check className="w-5 h-5 stroke-[2.5]" />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* LOADING STATE */}
        {isLoading && (
          <div className="text-center space-y-3">
            <div>
              <h3
                id="pdf-modal-title"
                className="text-base font-bold text-slate-900 transition-all"
              >
                {stageTitle}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Calibrating physical dimensions at 100% scale
              </p>
            </div>

            {/* Smooth Progress Bar */}
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200/80">
              <div
                className="bg-blue-600 h-full rounded-full transition-all duration-300 ease-out"
                style={{ width: `${stageProgress}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
              <span>Stage {typeof stage === 'number' ? stage : 1} of 4</span>
              <span>{stageProgress}%</span>
            </div>
          </div>
        )}

        {/* SUCCESS STATE */}
        {isSuccess && (
          <div className="text-center space-y-4">
            <div>
              <h3
                id="pdf-modal-title"
                className="text-lg font-bold text-slate-900"
              >
                PDF Ready
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 mt-1">
                Your A4 passport photo sheet is ready to print.
              </p>
            </div>

            {/* Print Scale Advice Box */}
            <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-xl text-left flex items-start gap-2.5">
              <Printer className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <p className="text-xs text-blue-950 font-medium leading-relaxed">
                Print at 100% / Actual Size for accurate dimensions.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={onDownloadAgain}
                className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download Again</span>
              </button>

              <button
                type="button"
                onClick={onStartOver}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-4 h-4 text-slate-500" />
                <span>Start New Photo</span>
              </button>
            </div>
          </div>
        )}

        {/* ERROR STATE */}
        {isError && (
          <div className="text-center space-y-4">
            <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 mx-auto flex items-center justify-center">
              <AlertCircle className="w-5 h-5" />
            </div>

            <div>
              <h3
                id="pdf-modal-title"
                className="text-base font-bold text-slate-900"
              >
                Generation Failed
              </h3>
              <p className="text-xs text-slate-600 mt-1">
                {errorMessage || "We couldn't generate the PDF. Please try again."}
              </p>
            </div>

            <div className="flex items-center gap-2 pt-1">
              {onRetry && (
                <button
                  type="button"
                  onClick={onRetry}
                  className="flex-1 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold cursor-pointer"
                >
                  Try Again
                </button>
              )}
              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium cursor-pointer"
                >
                  Dismiss
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
