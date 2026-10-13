import React from 'react';
import { ZoomIn, ZoomOut } from 'lucide-react';

interface ZoomControlProps {
  zoom: number;
  minZoom?: number;
  maxZoom?: number;
  step?: number;
  onChange: (newZoom: number) => void;
}

export const ZoomControl: React.FC<ZoomControlProps> = ({
  zoom,
  minZoom = 0.5,
  maxZoom = 3.5,
  step = 0.05,
  onChange,
}) => {
  const handleZoomIn = () => {
    onChange(Math.min(maxZoom, Math.round((zoom + 0.1) * 100) / 100));
  };

  const handleZoomOut = () => {
    onChange(Math.max(minZoom, Math.round((zoom - 0.1) * 100) / 100));
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(parseFloat(e.target.value));
  };

  const zoomPercent = Math.round(zoom * 100);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs font-medium text-slate-700">
        <span className="flex items-center gap-1.5">
          <ZoomIn className="w-3.5 h-3.5 text-blue-600" />
          Zoom
        </span>
        <button
          type="button"
          onClick={() => onChange(1)}
          className="font-mono text-slate-500 hover:text-blue-600 tabular-nums cursor-pointer hover:underline text-xs"
          title="Click to reset zoom to 100%"
        >
          {zoomPercent}%
        </button>
      </div>

      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={handleZoomOut}
          disabled={zoom <= minZoom}
          aria-label="Zoom out"
          className="w-11 h-11 rounded-xl border border-slate-200/90 bg-white hover:bg-slate-50 active:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-slate-800 transition-all shadow-2xs hover:border-blue-400 hover:text-blue-700 cursor-pointer shrink-0 active:scale-95"
        >
          <ZoomOut className="w-5 h-5 text-slate-700" />
        </button>

        <div className="flex-1 relative flex items-center px-1">
          <input
            type="range"
            min={minZoom}
            max={maxZoom}
            step={step}
            value={zoom}
            onChange={handleSliderChange}
            aria-label="Zoom level"
            className="w-full h-2.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          />
        </div>

        <button
          type="button"
          onClick={handleZoomIn}
          disabled={zoom >= maxZoom}
          aria-label="Zoom in"
          className="w-11 h-11 rounded-xl border border-slate-200/90 bg-white hover:bg-slate-50 active:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-slate-800 transition-all shadow-2xs hover:border-blue-400 hover:text-blue-700 cursor-pointer shrink-0 active:scale-95"
        >
          <ZoomIn className="w-5 h-5 text-slate-700" />
        </button>
      </div>
    </div>
  );
};
