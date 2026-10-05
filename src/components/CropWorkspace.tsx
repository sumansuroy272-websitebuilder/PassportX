import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  Move,
  Maximize2,
  Eye,
  EyeOff,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import {
  UploadedImage,
  EditorState,
  AspectRatioPreset,
} from '../types/passport';
import { getCssFilterString } from '../utils/imageProcessing';

interface CropWorkspaceProps {
  image: UploadedImage;
  editorState: EditorState;
  onPanChange: (pan: { x: number; y: number }) => void;
  onZoomChange: (zoom: number) => void;
  onToggleGuide: () => void;
  onResetPosition: () => void;
  onDimensionsCalculated?: (metrics: {
    frameWidth: number;
    frameHeight: number;
    baseScale: number;
  }) => void;
}

export const CropWorkspace: React.FC<CropWorkspaceProps> = ({
  image,
  editorState,
  onPanChange,
  onZoomChange,
  onToggleGuide,
  onResetPosition,
  onDimensionsCalculated,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 500, height: 500 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number; initialPanX: number; initialPanY: number } | null>(null);

  // Multi-touch tracking for pinch-to-zoom
  const touchPointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchStartDistRef = useRef<number | null>(null);
  const pinchStartZoomRef = useRef<number>(1);

  // ResizeObserver to track container dimensions
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateSize = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setContainerSize({ width: rect.width, height: rect.height });
      }
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(el);

    return () => observer.disconnect();
  }, []);

  const { aspectPreset, zoom, pan, rotation, adjustments, showBiometricGuide } = editorState;

  // Calculate crop frame dimensions inside the workspace
  // We want the frame to comfortably fit inside the container with margins
  const maxAvailableW = Math.max(220, containerSize.width - 48);
  const maxAvailableH = Math.max(260, containerSize.height - 48);

  let frameW: number;
  let frameH: number;

  const targetRatio = aspectPreset.ratio; // width / height

  if (maxAvailableW / maxAvailableH > targetRatio) {
    // Height is the constraint
    frameH = maxAvailableH;
    frameW = Math.round(frameH * targetRatio);
  } else {
    // Width is the constraint
    frameW = maxAvailableW;
    frameH = Math.round(frameW / targetRatio);
  }

  // Base scale calculation so image covers the frame comfortably initially
  const isRotated90or270 = rotation % 180 !== 0;
  const effectiveImgW = isRotated90or270 ? image.height : image.width;
  const effectiveImgH = isRotated90or270 ? image.width : image.height;

  // Scale factor so image covers the crop frame
  const baseScale = Math.max(frameW / effectiveImgW, frameH / effectiveImgH);

  // Notify parent of calculated geometry for accurate canvas rendering
  useEffect(() => {
    if (onDimensionsCalculated) {
      onDimensionsCalculated({
        frameWidth: frameW,
        frameHeight: frameH,
        baseScale,
      });
    }
  }, [frameW, frameH, baseScale, onDimensionsCalculated]);

  // Pointer event handlers for unified mouse & touch dragging
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Register touch
    touchPointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (touchPointersRef.current.size === 1) {
      setIsDragging(true);
      dragStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        initialPanX: pan.x,
        initialPanY: pan.y,
      };
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } else if (touchPointersRef.current.size === 2) {
      // Start pinch zoom
      const pts = Array.from(touchPointersRef.current.values());
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      pinchStartDistRef.current = dist;
      pinchStartZoomRef.current = zoom;
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    touchPointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    // Handle pinch zoom if 2 pointers
    if (touchPointersRef.current.size === 2 && pinchStartDistRef.current !== null) {
      const pts = Array.from(touchPointersRef.current.values());
      const currentDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      const ratio = currentDist / pinchStartDistRef.current;
      const newZoom = Math.min(3.5, Math.max(0.5, pinchStartZoomRef.current * ratio));
      onZoomChange(Math.round(newZoom * 100) / 100);
      return;
    }

    // Handle drag pan
    if (isDragging && dragStartRef.current && touchPointersRef.current.size === 1) {
      const deltaX = e.clientX - dragStartRef.current.x;
      const deltaY = e.clientY - dragStartRef.current.y;

      onPanChange({
        x: Math.round(dragStartRef.current.initialPanX + deltaX),
        y: Math.round(dragStartRef.current.initialPanY + deltaY),
      });
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    touchPointersRef.current.delete(e.pointerId);

    if (touchPointersRef.current.size < 2) {
      pinchStartDistRef.current = null;
    }

    if (touchPointersRef.current.size === 0) {
      setIsDragging(false);
      dragStartRef.current = null;
    }
  };

  const handlePointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    touchPointersRef.current.delete(e.pointerId);
    if (touchPointersRef.current.size === 0) {
      setIsDragging(false);
      dragStartRef.current = null;
      pinchStartDistRef.current = null;
    }
  };

  // Mouse wheel zoom
  const handleWheel = useCallback(
    (e: React.WheelEvent<HTMLDivElement>) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.05 : 0.95;
      const newZoom = Math.min(3.5, Math.max(0.5, zoom * zoomFactor));
      onZoomChange(Math.round(newZoom * 100) / 100);
    },
    [zoom, onZoomChange]
  );

  const filterStyle = getCssFilterString(adjustments);

  return (
    <div className="flex flex-col h-full">
      {/* Top Workspace Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-900 text-white rounded-t-xl text-xs">
        <div className="flex items-center gap-2">
          <span className="font-medium text-slate-200">
            Crop Frame: <strong className="text-white">{aspectPreset.name}</strong>
          </span>
          <span className="text-slate-400 hidden sm:inline">
            (Ratio {aspectPreset.widthMm}:{aspectPreset.heightMm})
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleGuide}
            className={`px-2.5 py-1 rounded flex items-center gap-1.5 transition-colors cursor-pointer text-xs ${
              showBiometricGuide
                ? 'bg-blue-600 text-white font-medium'
                : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'
            }`}
            title="Toggle biometric face and eye guidelines"
          >
            {showBiometricGuide ? (
              <Eye className="w-3.5 h-3.5" />
            ) : (
              <EyeOff className="w-3.5 h-3.5" />
            )}
            <span>Biometric Guide</span>
          </button>

          <button
            type="button"
            onClick={onResetPosition}
            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer text-xs flex items-center gap-1"
            title="Center image in crop frame"
          >
            <RotateCcw className="w-3 h-3" />
            <span className="hidden sm:inline">Center</span>
          </button>
        </div>
      </div>

      {/* Main Interactive Canvas Area */}
      <div
        ref={containerRef}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        className={`relative flex-1 min-h-[380px] sm:min-h-[460px] max-h-[560px] bg-slate-950 overflow-hidden select-none flex items-center justify-center touch-none ${
          isDragging ? 'cursor-grabbing' : 'cursor-grab'
        }`}
        style={{
          // Subtle checkered background to perceive transparency
          backgroundImage:
            'radial-gradient(circle, #1e293b 1px, transparent 1px)',
          backgroundSize: '16px 16px',
        }}
      >
        {/* Layer 0: The Image moving underneath */}
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none transition-filter duration-75"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px)`,
          }}
        >
          <img
            src={image.rawUrl}
            alt={image.name}
            draggable={false}
            referrerPolicy="no-referrer"
            className="max-w-none origin-center will-change-transform select-none"
            style={{
              width: `${image.width}px`,
              height: `${image.height}px`,
              transform: `rotate(${rotation}deg) scale(${baseScale * zoom})`,
              filter: filterStyle,
            }}
          />
        </div>

        {/* Layer 1: The Fixed Crop Frame & Scrim */}
        <div
          className="relative pointer-events-none z-10"
          style={{
            width: `${frameW}px`,
            height: `${frameH}px`,
            // Dark scrim covering everything outside the crop frame
            boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.72)',
          }}
        >
          {/* Frame Border with subtle glow */}
          <div className="absolute inset-0 border-2 border-white/90 shadow-xs" />

          {/* Camera Corner Brackets */}
          <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-blue-400" />
          <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-blue-400" />
          <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-blue-400" />
          <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-blue-400" />

          {/* Layer 2: Biometric Guidelines (Dashed oval for head, eye line, crown line) */}
          {showBiometricGuide && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              {/* Vertical center axis */}
              <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-px border-l border-dashed border-white/30" />

              {/* Eye level line (approx 58% from bottom / 42% from top standard) */}
              <div
                className="absolute left-0 right-0 border-t border-dashed border-amber-300/80"
                style={{ top: '42%' }}
              >
                <span className="absolute right-1 -top-3.5 text-[9px] font-mono text-amber-200/90 tracking-wider">
                  EYES
                </span>
              </div>

              {/* Crown of head guide (approx 12% from top) */}
              <div
                className="absolute left-0 right-0 border-t border-dotted border-white/40"
                style={{ top: '12%' }}
              >
                <span className="absolute left-1 -top-3 text-[9px] font-mono text-slate-300/70 tracking-wider">
                  CROWN
                </span>
              </div>

              {/* Chin guide line (approx 80% from top) */}
              <div
                className="absolute left-0 right-0 border-t border-dotted border-white/40"
                style={{ top: '80%' }}
              >
                <span className="absolute left-1 -top-3 text-[9px] font-mono text-slate-300/70 tracking-wider">
                  CHIN
                </span>
              </div>

              {/* Biometric Head Oval Guideline */}
              <div
                className="absolute left-1/2 -translate-x-1/2 rounded-full border border-dashed border-amber-300/60"
                style={{
                  top: '12%',
                  width: '64%',
                  height: '68%',
                }}
              />
            </div>
          )}

          {/* Size Tag inside frame (bottom right) */}
          <div className="absolute bottom-1 right-1.5 bg-slate-900/80 backdrop-blur-xs text-white/90 text-[10px] font-mono px-1.5 py-0.5 rounded pointer-events-none">
            {aspectPreset.widthMm} × {aspectPreset.heightMm} mm
          </div>
        </div>

        {/* Overlay Drag Hint when user hovers or begins */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 pointer-events-none bg-slate-900/80 backdrop-blur-xs text-slate-300 text-[11px] px-3 py-1 rounded-full flex items-center gap-1.5 shadow-sm border border-slate-700/60">
          <Move className="w-3 h-3 text-blue-400" />
          <span>Drag to position face · Scroll to zoom</span>
        </div>
      </div>

      {/* Bottom status bar of crop area */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-100 border-t border-slate-200 text-xs text-slate-600 rounded-b-xl">
        <div className="flex items-center gap-2">
          <span>
            Position: <span className="font-mono tabular-nums">{pan.x}px, {pan.y}px</span>
          </span>
          <span aria-hidden="true" className="text-slate-300">·</span>
          <span>
            Zoom: <span className="font-mono tabular-nums">{Math.round(zoom * 100)}%</span>
          </span>
        </div>

        <button
          type="button"
          onClick={onResetPosition}
          className="text-xs text-blue-600 hover:text-blue-800 font-medium cursor-pointer"
        >
          Reset Position
        </button>
      </div>
    </div>
  );
};
