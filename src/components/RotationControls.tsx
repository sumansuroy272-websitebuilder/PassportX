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

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onRotateLeft}
          className="h-10 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium flex items-center justify-center gap-2 transition-colors shadow-2xs cursor-pointer active:scale-98"
        >
          <RotateCcw className="w-4 h-4 text-slate-600" />
          <span>Rotate Left</span>
        </button>

        <button
          type="button"
          onClick={onRotateRight}
          className="h-10 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium flex items-center justify-center gap-2 transition-colors shadow-2xs cursor-pointer active:scale-98"
        >
          <RotateCw className="w-4 h-4 text-slate-600" />
          <span>Rotate Right</span>
        </button>
      </div>
    </div>
  );
};
