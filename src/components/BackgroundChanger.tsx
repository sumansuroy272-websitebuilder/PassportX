import React, { useState } from 'react';
import {
  Wand2,
  Check,
  RotateCcw,
  Sliders,
  Palette,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  BgColorPreset,
  BG_PRESET_COLORS,
  BgRemovalOptions,
} from '../utils/backgroundRemoval';

interface BackgroundChangerProps {
  currentPreset: BgColorPreset;
  customColor: string;
  isProcessing: boolean;
  onApplyBackground: (preset: BgColorPreset, customColor?: string, options?: Partial<BgRemovalOptions>) => Promise<void>;
  onResetToOriginal: () => void;
  tolerance: number;
  onToleranceChange: (val: number) => void;
  smoothness: number;
  onSmoothnessChange: (val: number) => void;
}

export const BackgroundChanger: React.FC<BackgroundChangerProps> = ({
  currentPreset,
  customColor,
  isProcessing,
  onApplyBackground,
  onResetToOriginal,
  tolerance,
  onToleranceChange,
  smoothness,
  onSmoothnessChange,
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const presets: {
    id: BgColorPreset;
    name: string;
    bengali: string;
    hex: string;
    bgClass: string;
    borderClass: string;
    textClass: string;
  }[] = [
    {
      id: 'white',
      name: 'White',
      bengali: 'সাদা',
      hex: '#FFFFFF',
      bgClass: 'bg-white',
      borderClass: 'border-slate-300',
      textClass: 'text-slate-800',
    },
    {
      id: 'skyblue',
      name: 'Sky Blue',
      bengali: 'আকাশি নীল',
      hex: '#70B5F9',
      bgClass: 'bg-[#70B5F9]',
      borderClass: 'border-sky-400',
      textClass: 'text-white',
    },
    {
      id: 'gray',
      name: 'Studio Gray',
      bengali: 'হালকা ধূসর',
      hex: '#E2E8F0',
      bgClass: 'bg-[#E2E8F0]',
      borderClass: 'border-slate-300',
      textClass: 'text-slate-700',
    },
    {
      id: 'transparent',
      name: 'Transparent',
      bengali: 'স্বচ্ছ',
      hex: 'transparent',
      bgClass: 'bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:6px_6px] bg-slate-100',
      borderClass: 'border-slate-300',
      textClass: 'text-slate-700',
    },
  ];

  const isOriginal = currentPreset === 'original';

  return (
    <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs space-y-3.5">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-100 gap-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-200/80 flex items-center justify-center text-blue-600">
            <Wand2 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <span>Passport Background</span>
              <span className="text-[11px] font-normal text-blue-600 font-sans">
                (পটভূমি পরিবর্তন)
              </span>
            </h3>
            <p className="text-[11px] text-slate-500">
              1-click background removal for passport &amp; visa photos
            </p>
          </div>
        </div>

        {/* Current Status Badge */}
        {!isOriginal && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Check className="w-3 h-3 text-emerald-600" />
            <span>Active</span>
          </span>
        )}
      </div>

      {/* Main 1-Click Action Buttons: White & Sky Blue */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* White Background Button */}
        <button
          type="button"
          onClick={() => onApplyBackground('white')}
          disabled={isProcessing}
          className={`p-3 rounded-xl border text-left transition-all cursor-pointer relative overflow-hidden min-h-[58px] ${
            currentPreset === 'white'
              ? 'border-blue-600 bg-blue-50/70 ring-2 ring-blue-600/30'
              : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 rounded-full border border-slate-300 bg-white shadow-2xs shrink-0" />
              <span className="text-xs sm:text-sm font-bold text-slate-900">
                White (সাদা)
              </span>
            </div>
            {currentPreset === 'white' && (
              <span className="w-2 h-2 rounded-full bg-blue-600 inline-block shrink-0" />
            )}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 pl-6">
            Standard passport / visa
          </div>
        </button>

        {/* Sky Blue Background Button */}
        <button
          type="button"
          onClick={() => onApplyBackground('skyblue')}
          disabled={isProcessing}
          className={`p-3 rounded-xl border text-left transition-all cursor-pointer relative overflow-hidden min-h-[58px] ${
            currentPreset === 'skyblue'
              ? 'border-blue-600 bg-sky-50/80 ring-2 ring-blue-600/30'
              : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 rounded-full border border-sky-400 bg-[#70B5F9] shadow-2xs shrink-0" />
              <span className="text-xs sm:text-sm font-bold text-slate-900">
                Sky Blue (আকাশি)
              </span>
            </div>
            {currentPreset === 'skyblue' && (
              <span className="w-2 h-2 rounded-full bg-blue-600 inline-block shrink-0" />
            )}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 pl-6">
            Exam &amp; Asian passport standard
          </div>
        </button>
      </div>

      {/* Quick Color Chips Row: Studio Gray, Transparent, Custom & Reset to Original */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <span className="text-[11px] font-semibold text-slate-500 w-full sm:w-auto">
          More Options:
        </span>

        {/* Studio Gray */}
        <button
          type="button"
          onClick={() => onApplyBackground('gray')}
          disabled={isProcessing}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium cursor-pointer transition-colors ${
            currentPreset === 'gray'
              ? 'border-blue-600 bg-blue-50 text-blue-700 ring-1 ring-blue-600/40'
              : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
          }`}
          title="Light Gray Studio Background"
        >
          <span className="w-3 h-3 rounded-full bg-[#E2E8F0] border border-slate-300 shrink-0" />
          <span>Gray</span>
        </button>

        {/* Transparent */}
        <button
          type="button"
          onClick={() => onApplyBackground('transparent')}
          disabled={isProcessing}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium cursor-pointer transition-colors ${
            currentPreset === 'transparent'
              ? 'border-blue-600 bg-blue-50 text-blue-700 ring-1 ring-blue-600/40'
              : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
          }`}
          title="Transparent Cutout (PNG)"
        >
          <span className="w-3 h-3 rounded-full bg-[radial-gradient(#94a3b8_1px,transparent_1px)] [background-size:4px_4px] bg-slate-200 border border-slate-300 shrink-0" />
          <span>Cutout</span>
        </button>

        {/* Custom Color input */}
        <label
          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium cursor-pointer transition-colors ${
            currentPreset === 'custom'
              ? 'border-blue-600 bg-blue-50 text-blue-700 ring-1 ring-blue-600/40'
              : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
          }`}
          title="Choose Custom Color"
        >
          <Palette className="w-3 h-3 text-slate-500" />
          <span>Custom</span>
          <input
            type="color"
            value={customColor}
            onChange={(e) => onApplyBackground('custom', e.target.value)}
            className="w-4 h-4 p-0 border-0 rounded cursor-pointer"
          />
        </label>

        {/* Restore Original Background */}
        <button
          type="button"
          onClick={onResetToOriginal}
          disabled={isOriginal || isProcessing}
          className="ml-auto inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 active:bg-slate-200 text-slate-600 text-xs font-medium cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          title="Restore original photo background"
        >
          <RotateCcw className="w-3 h-3 text-slate-500" />
          <span>Original (আসল)</span>
        </button>
      </div>

      {/* Advanced Fine-Tuning Toggle (Sensitivity / Tolerance) */}
      <div className="pt-1">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center justify-between w-full text-[11px] font-semibold text-slate-500 hover:text-slate-800 py-1 cursor-pointer transition-colors"
        >
          <span className="flex items-center gap-1">
            <Sliders className="w-3 h-3 text-slate-400" />
            <span>Refine Edge &amp; Tolerance (প্রান্ত সংবেদনশীলতা)</span>
          </span>
          {showAdvanced ? (
            <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          )}
        </button>

        {showAdvanced && (
          <div className="mt-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3 text-xs">
            {/* Tolerance / Sensitivity Slider */}
            <div>
              <div className="flex items-center justify-between text-slate-700 font-medium mb-1">
                <span>Cutout Sensitivity (টলারেন্স):</span>
                <span className="font-mono text-slate-900 font-semibold">{tolerance}%</span>
              </div>
              <input
                type="range"
                min="15"
                max="65"
                step="1"
                value={tolerance}
                onChange={(e) => onToleranceChange(Number(e.target.value))}
                className="w-full accent-blue-600 cursor-pointer h-2 bg-slate-200 rounded-lg appearance-none"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                <span>Gentle (15%)</span>
                <span>Default (35%)</span>
                <span>Strong (65%)</span>
              </div>
            </div>

            {/* Edge Smoothness Slider */}
            <div>
              <div className="flex items-center justify-between text-slate-700 font-medium mb-1">
                <span>Edge Softness (মসৃণতা):</span>
                <span className="font-mono text-slate-900 font-semibold">{smoothness} px</span>
              </div>
              <input
                type="range"
                min="1"
                max="4"
                step="1"
                value={smoothness}
                onChange={(e) => onSmoothnessChange(Number(e.target.value))}
                className="w-full accent-blue-600 cursor-pointer h-2 bg-slate-200 rounded-lg appearance-none"
              />
            </div>

            {/* Re-apply button */}
            {!isOriginal && (
              <button
                type="button"
                onClick={() => onApplyBackground(currentPreset, customColor, { tolerance, smoothness })}
                disabled={isProcessing}
                className="w-full py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Re-apply Cutout (পুনরায় প্রয়োগ করুন)</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Processing Spinner Overlay / Banner */}
      {isProcessing && (
        <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center gap-2 text-xs text-blue-700 font-medium animate-pulse">
          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span>Removing background &amp; applying color... (পটভূমি সরানো হচ্ছে...)</span>
        </div>
      )}
    </div>
  );
};
