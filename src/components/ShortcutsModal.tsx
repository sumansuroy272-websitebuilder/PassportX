import React, { useEffect } from 'react';
import { Keyboard, X, Command } from 'lucide-react';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isMac?: boolean;
}

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const isMac =
    typeof navigator !== 'undefined' &&
    /Mac|iPod|iPhone|iPad/.test(navigator.platform || '');

  const modKey = isMac ? 'Cmd' : 'Ctrl';

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
      aria-labelledby="shortcuts-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 text-slate-800 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Keyboard className="w-4 h-4" />
            </div>
            <div>
              <h3 id="shortcuts-title" className="text-sm font-bold text-slate-900">
                Keyboard Shortcuts
              </h3>
              <p className="text-[11px] text-slate-400">
                Speed up your passport preparation workflow
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Close keyboard shortcuts dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Shortcuts Categories */}
        <div className="space-y-4 text-xs">
          {/* Section: Adjustments & Framing */}
          <div className="space-y-2">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Photo Editor &amp; Adjustments
            </h4>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-600">Reset image adjustments</span>
                <kbd className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded font-mono text-[11px] text-slate-700 shadow-2xs font-semibold">
                  R
                </kbd>
              </div>

              <div className="flex items-center justify-between py-1">
                <span className="text-slate-600">Open A4 Layout / Print Preview</span>
                <div className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded font-mono text-[11px] text-slate-700 shadow-2xs font-semibold">
                    {modKey}
                  </kbd>
                  <span className="text-slate-400">+</span>
                  <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded font-mono text-[11px] text-slate-700 shadow-2xs font-semibold">
                    S
                  </kbd>
                </div>
              </div>

              <div className="flex items-center justify-between py-1">
                <span className="text-slate-600">Center photo in crop frame</span>
                <kbd className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded font-mono text-[11px] text-slate-700 shadow-2xs font-semibold">
                  C
                </kbd>
              </div>

              <div className="flex items-center justify-between py-1">
                <span className="text-slate-600">Zoom in / Zoom out</span>
                <div className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded font-mono text-[11px] text-slate-700 shadow-2xs font-semibold">
                    +
                  </kbd>
                  <span className="text-slate-400">/</span>
                  <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded font-mono text-[11px] text-slate-700 shadow-2xs font-semibold">
                    -
                  </kbd>
                </div>
              </div>

              <div className="flex items-center justify-between py-1">
                <span className="text-slate-600">Rotate left / Rotate right</span>
                <div className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded font-mono text-[11px] text-slate-700 shadow-2xs font-semibold">
                    [
                  </kbd>
                  <span className="text-slate-400">/</span>
                  <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded font-mono text-[11px] text-slate-700 shadow-2xs font-semibold">
                    ]
                  </kbd>
                </div>
              </div>
            </div>
          </div>

          {/* Section: A4 Layout & PDF */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              A4 Layout &amp; PDF Printing
            </h4>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-600">Download Printable PDF</span>
                <div className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded font-mono text-[11px] text-slate-700 shadow-2xs font-semibold">
                    {modKey}
                  </kbd>
                  <span className="text-slate-400">+</span>
                  <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded font-mono text-[11px] text-slate-700 shadow-2xs font-semibold">
                    S
                  </kbd>
                </div>
              </div>

              <div className="flex items-center justify-between py-1">
                <span className="text-slate-600">Print Sheet (Browser Dialog)</span>
                <div className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded font-mono text-[11px] text-slate-700 shadow-2xs font-semibold">
                    {modKey}
                  </kbd>
                  <span className="text-slate-400">+</span>
                  <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded font-mono text-[11px] text-slate-700 shadow-2xs font-semibold">
                    P
                  </kbd>
                </div>
              </div>

              <div className="flex items-center justify-between py-1">
                <span className="text-slate-600">Auto Arrange grid</span>
                <kbd className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded font-mono text-[11px] text-slate-700 shadow-2xs font-semibold">
                  A
                </kbd>
              </div>

              <div className="flex items-center justify-between py-1">
                <span className="text-slate-600">Return to Photo Editor</span>
                <kbd className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded font-mono text-[11px] text-slate-700 shadow-2xs font-semibold">
                  Esc
                </kbd>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-2 text-center text-[11px] text-slate-400">
          Shortcuts are disabled while editing text or number inputs.
        </div>
      </div>
    </div>
  );
};
