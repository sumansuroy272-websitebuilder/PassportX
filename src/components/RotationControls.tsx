import React from 'react';
import { RotateCcw, RotateCw } from 'lucide-react';

interface RotationControlsProps {
  rotation: number;
  onRotateLeft: () => void;
  onRotateRight: () => void;
}

export const RotationControls: React.FC<RotationControlsProps> = ({
  rotation,
  onRotateLeft,
  onRotateRight,
}) => {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs font-medium text-slate-700">
        <span className="flex items-center gap-1.5">
          <RotateCw className="w-3.5 h-3.5 text-blue-600" />
          Orientation
        </span>
        <span className="font-mono text-slate-400 tabular-nums text-xs">
          {rotation}°
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        <button
          type="button"
          onClick={onRotateLeft}
          className="min-h-[44px] px-3.5 rounded-xl border border-slate-200/90 bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-800 text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all shadow-2xs hover:border-blue-400 hover:text-blue-700 cursor-pointer active:scale-[0.98]"
        >
          <RotateCcw className="w-4 h-4 text-slate-600 shrink-0" />
          <span>Rotate Left (-90°)</span>
        </button>

        <button
          type="button"
          onClick={onRotateRight}
          className="min-h-[44px] px-3.5 rounded-xl border border-slate-200/90 bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-800 text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all shadow-2xs hover:border-blue-400 hover:text-blue-700 cursor-pointer active:scale-[0.98]"
        >
          <RotateCw className="w-4 h-4 text-slate-600 shrink-0" />
          <span>Rotate Right (+90°)</span>
        </button>
      </div>
    </div>
  );
};
