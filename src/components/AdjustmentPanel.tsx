import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Sun,
  Contrast,
  Palette,
  RotateCcw,
} from 'lucide-react';
import { EditorAdjustments, DEFAULT_ADJUSTMENTS } from '../types/passport';

interface AdjustmentPanelProps {
  adjustments: EditorAdjustments;
  onChange: (adjustments: EditorAdjustments) => void;
  onResetAdjustments: () => void;
}

export const AdjustmentPanel: React.FC<AdjustmentPanelProps> = ({
  adjustments,
  onChange,
  onResetAdjustments,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const handleBrightnessChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({
      ...adjustments,
      brightness: parseInt(e.target.value, 10),
    });
  };

  const handleContrastChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({
      ...adjustments,
      contrast: parseInt(e.target.value, 10),
    });
  };

  const handleSaturationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({
      ...adjustments,
      saturation: parseInt(e.target.value, 10),
    });
  };

  const handleGrayscaleToggle = () => {
    onChange({
      ...adjustments,
      grayscale: !adjustments.grayscale,
    });
  };

  const isAdjusted =
    adjustments.brightness !== DEFAULT_ADJUSTMENTS.brightness ||
    adjustments.contrast !== DEFAULT_ADJUSTMENTS.contrast ||
    adjustments.saturation !== DEFAULT_ADJUSTMENTS.saturation ||
    adjustments.grayscale !== DEFAULT_ADJUSTMENTS.grayscale;

  return (
    <div className="border border-slate-200/90 rounded-2xl bg-white overflow-hidden shadow-2xs">
      {/* Header / Accordion trigger */}
      <div className="flex items-center justify-between p-3.5 bg-slate-50/70 border-b border-slate-200/80 gap-2">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 text-sm font-bold text-slate-900 cursor-pointer hover:text-blue-600 transition-colors flex-1 text-left min-h-[38px]"
          aria-expanded={isExpanded}
        >
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-slate-500 shrink-0" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />
          )}
          <span>Lighting &amp; Color Adjustments</span>
          {isAdjusted && (
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-100/80 border border-blue-200 px-2 py-0.5 rounded-md">
              Edited
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={onResetAdjustments}
          disabled={!isAdjusted}
          className="text-xs font-semibold text-slate-700 hover:text-blue-700 hover:bg-blue-50/60 disabled:opacity-30 disabled:pointer-events-none flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white shadow-2xs transition-all cursor-pointer shrink-0 min-h-[36px]"
          title="Reset Brightness, Contrast, Saturation, and Grayscale"
        >
          <RotateCcw className="w-3.5 h-3.5 shrink-0" />
          <span>Reset All</span>
        </button>
      </div>

      {/* Expandable Content */}
      {isExpanded && (
        <div className="p-4 space-y-4">
          {/* Brightness */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-slate-700">
              <span className="flex items-center gap-1.5 font-medium">
                <Sun className="w-3.5 h-3.5 text-amber-500" />
                Brightness
              </span>
              <button
                type="button"
                onClick={() => onChange({ ...adjustments, brightness: 0 })}
                className="font-mono text-slate-600 hover:text-blue-700 bg-slate-100 hover:bg-blue-50 px-2 py-0.5 rounded text-[11px] tabular-nums font-semibold cursor-pointer transition-colors"
                title="Reset brightness to 0"
              >
                {adjustments.brightness > 0 ? `+${adjustments.brightness}` : adjustments.brightness}
              </button>
            </div>
            <input
              type="range"
              min="-100"
              max="100"
              step="1"
              value={adjustments.brightness}
              onChange={handleBrightnessChange}
              aria-label="Brightness slider"
              className="w-full h-2.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
          </div>

          {/* Contrast */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-slate-700">
              <span className="flex items-center gap-1.5 font-medium">
                <Contrast className="w-3.5 h-3.5 text-blue-500" />
                Contrast
              </span>
              <button
                type="button"
                onClick={() => onChange({ ...adjustments, contrast: 0 })}
                className="font-mono text-slate-600 hover:text-blue-700 bg-slate-100 hover:bg-blue-50 px-2 py-0.5 rounded text-[11px] tabular-nums font-semibold cursor-pointer transition-colors"
                title="Reset contrast to 0"
              >
                {adjustments.contrast > 0 ? `+${adjustments.contrast}` : adjustments.contrast}
              </button>
            </div>
            <input
              type="range"
              min="-100"
              max="100"
              step="1"
              value={adjustments.contrast}
              onChange={handleContrastChange}
              aria-label="Contrast slider"
              className="w-full h-2.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
          </div>

          {/* Saturation */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-slate-700">
              <span className="flex items-center gap-1.5 font-medium">
                <Palette className="w-3.5 h-3.5 text-emerald-500" />
                Saturation
              </span>
              <button
                type="button"
                onClick={() => onChange({ ...adjustments, saturation: 0 })}
                className="font-mono text-slate-600 hover:text-blue-700 bg-slate-100 hover:bg-blue-50 px-2 py-0.5 rounded text-[11px] tabular-nums font-semibold cursor-pointer transition-colors"
                title="Reset saturation to 0"
              >
                {adjustments.saturation > 0 ? `+${adjustments.saturation}` : adjustments.saturation}
              </button>
            </div>
            <input
              type="range"
              min="-100"
              max="100"
              step="1"
              value={adjustments.saturation}
              disabled={adjustments.grayscale}
              onChange={handleSaturationChange}
              aria-label="Saturation slider"
              className="w-full h-2.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/30 disabled:opacity-40 disabled:cursor-not-allowed"
            />
          </div>

          {/* Grayscale Toggle */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            <div>
              <span className="text-xs font-medium text-slate-700 block">
                Grayscale
              </span>
              <span className="text-[11px] text-slate-400 block">
                Black &amp; white document mode
              </span>
            </div>

            <button
              type="button"
              onClick={handleGrayscaleToggle}
              role="switch"
              aria-checked={adjustments.grayscale}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500/30 ${
                adjustments.grayscale ? 'bg-blue-600' : 'bg-slate-200'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                  adjustments.grayscale ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
