import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  RotateCcw,
  RotateCw,
  Sliders,
  Sparkles,
  Download,
  Image as ImageIcon,
  ArrowLeft,
  Check,
  FileCheck,
  Info,
  Printer,
  Crop,
  UserCheck,
  X,
  Scan,
  Keyboard,
  ShieldCheck,
} from 'lucide-react';
import {
  UploadedImage,
  EditorState,
  DEFAULT_EDITOR_STATE,
  DEFAULT_ADJUSTMENTS,
  ASPECT_RATIO_PRESETS,
  AspectRatioPreset,
  DetectedFace,
  PhotoPresetType,
  DimensionUnit,
} from '../types/passport';
import { CropWorkspace } from './CropWorkspace';
import { ZoomControl } from './ZoomControl';
import { RotationControls } from './RotationControls';
import { AdjustmentPanel } from './AdjustmentPanel';
import { A4PrintLayout } from './A4PrintLayout';
import { ShortcutsModal } from './ShortcutsModal';
import { renderHighResPhoto, loadImageElement } from '../utils/imageProcessing';
import { detectPrimaryFace, calculatePassportAutoCrop } from '../utils/faceDetection';

interface ImageEditorProps {
  image: UploadedImage;
  onResetImage: () => void;
  onStepChange?: (step: 'adjust' | 'layout' | 'download') => void;
}

export const ImageEditor: React.FC<ImageEditorProps> = ({
  image,
  onResetImage,
  onStepChange,
}) => {
  const [editorState, setEditorState] = useState<EditorState>({
    ...DEFAULT_EDITOR_STATE,
  });

  // Editor mode: 'edit' or 'a4-layout'
  const [activeTab, setActiveTab] = useState<'edit' | 'a4-layout'>('edit');
  const [preparedPhotoDataUrl, setPreparedPhotoDataUrl] = useState<string | null>(null);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [shortcutFeedback, setShortcutFeedback] = useState<string | null>(null);

  const isMac =
    typeof navigator !== 'undefined' &&
    /Mac|iPod|iPhone|iPad/.test(navigator.platform || '');

  // Cached calculated metrics from the workspace for canvas rendering
  const metricsRef = useRef<{
    frameWidth: number;
    frameHeight: number;
    baseScale: number;
  }>({
    frameWidth: 350,
    frameHeight: 450,
    baseScale: 1,
  });

  const [isExporting, setIsExporting] = useState(false);
  const [isPreparingPrint, setIsPreparingPrint] = useState(false);
  const [exportSuccessMessage, setExportSuccessMessage] = useState<string | null>(null);

  // Face detection states
  const [isDetectingFace, setIsDetectingFace] = useState(false);
  const [detectedFace, setDetectedFace] = useState<DetectedFace | null>(null);
  const [faceDetectionNotice, setFaceDetectionNotice] = useState<{
    show: boolean;
    detected: boolean;
    message: string;
  } | null>(null);

  const initialDetectionRanRef = useRef(false);

  // Core Face Detection Execution
  const runFaceDetection = useCallback(async (currentMetrics?: {
    frameWidth: number;
    frameHeight: number;
    baseScale: number;
  }) => {
    try {
      setIsDetectingFace(true);
      const imgElement = await loadImageElement(image.rawUrl);
      const face = await detectPrimaryFace(imgElement);

      if (face) {
        setDetectedFace(face);
        const metrics = currentMetrics || metricsRef.current;

        // Auto-adjust crop frame to center face according to 35:45 passport rules
        const autoCrop = calculatePassportAutoCrop({
          face,
          imageWidth: image.width,
          imageHeight: image.height,
          frameWidth: metrics.frameWidth || 350,
          frameHeight: metrics.frameHeight || 450,
          baseScale: metrics.baseScale || 1,
          aspectPreset: editorState.aspectPreset,
        });

        setEditorState((prev) => ({
          ...prev,
          zoom: autoCrop.zoom,
          pan: autoCrop.pan,
        }));

        setFaceDetectionNotice({
          show: true,
          detected: true,
          message: 'Face detected · Auto-adjusted to standard passport proportions (35:45 ratio)',
        });
      } else {
        setDetectedFace(null);
        setFaceDetectionNotice({
          show: true,
          detected: false,
          message: 'No face detected · You can position and zoom the photo manually',
        });
      }
    } catch (err) {
      console.warn('Face detection error:', err);
    } finally {
      setIsDetectingFace(false);
    }
  }, [image.rawUrl, image.width, image.height, editorState.aspectPreset]);

  // When workspace calculates metrics for the first time, auto-trigger face detection
  const handleDimensionsCalculated = useCallback(
    (metrics: { frameWidth: number; frameHeight: number; baseScale: number }) => {
      metricsRef.current = metrics;
      if (!initialDetectionRanRef.current) {
        initialDetectionRanRef.current = true;
        runFaceDetection(metrics);
      }
    },
    [runFaceDetection]
  );

  // Zoom handlers
  const handleZoomChange = (newZoom: number) => {
    setEditorState((prev) => ({
      ...prev,
      zoom: newZoom,
    }));
  };

  // Pan handlers
  const handlePanChange = (pan: { x: number; y: number }) => {
    setEditorState((prev) => ({
      ...prev,
      pan,
    }));
  };

  // Rotation handlers (Rotate Left -90°, Rotate Right +90°)
  const handleRotateLeft = () => {
    setEditorState((prev) => ({
      ...prev,
      rotation: (prev.rotation - 90 + 360) % 360,
    }));
  };

  const handleRotateRight = () => {
    setEditorState((prev) => ({
      ...prev,
      rotation: (prev.rotation + 90) % 360,
    }));
  };

  // Reset Adjustments (resets Brightness, Contrast, Saturation, Grayscale)
  const handleResetAdjustments = () => {
    setEditorState((prev) => ({
      ...prev,
      adjustments: { ...DEFAULT_ADJUSTMENTS },
    }));
  };

  // Reset Framing (resets Pan, Zoom, Rotation)
  const handleResetFraming = () => {
    setEditorState((prev) => ({
      ...prev,
      pan: { x: 0, y: 0 },
      zoom: 1,
      rotation: 0,
    }));
  };

  // Preset ratio selection
  const handlePresetSelect = (preset: AspectRatioPreset) => {
    setEditorState((prev) => ({
      ...prev,
      aspectPreset: preset,
      pan: { x: 0, y: 0 },
    }));
  };

  // Biometric guide toggle
  const handleToggleGuide = () => {
    setEditorState((prev) => ({
      ...prev,
      showBiometricGuide: !prev.showBiometricGuide,
    }));
  };

  // Generate cropped photo data URL
  const generateCroppedPhoto = async (): Promise<string> => {
    const imgElement = await loadImageElement(image.rawUrl);
    return renderHighResPhoto({
      image: imgElement,
      aspectPreset: editorState.aspectPreset,
      frameWidth: metricsRef.current.frameWidth,
      frameHeight: metricsRef.current.frameHeight,
      baseScale: metricsRef.current.baseScale,
      zoom: editorState.zoom,
      pan: editorState.pan,
      rotation: editorState.rotation,
      adjustments: editorState.adjustments,
      targetDpi: 600,
    });
  };

  // Switch to A4 Layout Mode (Phase 2)
  const handleOpenA4Layout = async () => {
    try {
      setIsPreparingPrint(true);
      const photoUrl = await generateCroppedPhoto();
      setPreparedPhotoDataUrl(photoUrl);
      setActiveTab('a4-layout');
      onStepChange?.('layout');
    } catch (err) {
      console.error('Failed to prepare photo for printing:', err);
      alert('Could not render photo for A4 layout.');
    } finally {
      setIsPreparingPrint(false);
    }
  };

  // Export current photo as single high-res photo
  const handleDownloadSinglePhoto = async () => {
    try {
      setIsExporting(true);
      const highResDataUrl = await generateCroppedPhoto();

      const link = document.createElement('a');
      link.href = highResDataUrl;
      link.download = `passport-photo-${editorState.aspectPreset.id}-${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setExportSuccessMessage('Passport photo exported successfully at 600 DPI!');
      setTimeout(() => setExportSuccessMessage(null), 4000);
    } catch (err: any) {
      console.error('Export failed:', err);
      alert('Could not generate high-resolution export. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  // Global Keyboard Shortcuts (R to reset adjustments, Ctrl+S / Cmd+S for A4 layout)
  useEffect(() => {
    if (activeTab !== 'edit') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger when user is typing in an input or textarea
      const activeEl = document.activeElement;
      const isInput =
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          activeEl.tagName === 'SELECT' ||
          (activeEl as HTMLElement).isContentEditable);

      if (isInput) return;

      // Ctrl+S or Cmd+S -> Open A4 Layout
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleOpenA4Layout();
        return;
      }

      // 'r' or 'R' -> Reset Adjustments
      if (e.key.toLowerCase() === 'r' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        handleResetAdjustments();
        setShortcutFeedback('Adjustments reset to default (R)');
        setTimeout(() => setShortcutFeedback(null), 2500);
        return;
      }

      // 'c' or 'C' -> Center framing
      if (e.key.toLowerCase() === 'c' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        handleResetFraming();
        setShortcutFeedback('Photo centered in frame (C)');
        setTimeout(() => setShortcutFeedback(null), 2500);
        return;
      }

      // '+' or '=' -> Zoom In
      if ((e.key === '+' || e.key === '=') && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setEditorState((prev) => ({
          ...prev,
          zoom: Math.min(3.5, Math.round((prev.zoom + 0.1) * 100) / 100),
        }));
        return;
      }

      // '-' or '_' -> Zoom Out
      if ((e.key === '-' || e.key === '_') && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setEditorState((prev) => ({
          ...prev,
          zoom: Math.max(0.5, Math.round((prev.zoom - 0.1) * 100) / 100),
        }));
        return;
      }

      // '[' -> Rotate Left
      if (e.key === '[' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        handleRotateLeft();
        return;
      }

      // ']' -> Rotate Right
      if (e.key === ']' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        handleRotateRight();
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
  }, [
    activeTab,
    handleOpenA4Layout,
    handleResetAdjustments,
    handleResetFraming,
    handleRotateLeft,
    handleRotateRight,
  ]);

  // If in A4 Layout tab, render the dedicated A4PrintLayout component
  if (activeTab === 'a4-layout' && preparedPhotoDataUrl) {
    return (
      <A4PrintLayout
        processedPhotoUrl={preparedPhotoDataUrl}
        initialPhotoSize={editorState.photoSize}
        onGenerateFreshPhoto={generateCroppedPhoto}
        onStartOver={onResetImage}
        onPdfExported={() => onStepChange?.('download')}
        onBackToAdjust={() => {
          setActiveTab('edit');
          onStepChange?.('adjust');
        }}
      />
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto space-y-4">
      {/* Keyboard Shortcuts Dialog */}
      <ShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />

      {/* Floating Shortcut Toast Notification */}
      {shortcutFeedback && (
        <div
          role="status"
          className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-xs font-medium px-4 py-2 rounded-full shadow-lg border border-slate-700/80 flex items-center gap-2 animate-in fade-in"
        >
          <Check className="w-3.5 h-3.5 text-blue-400" />
          <span>{shortcutFeedback}</span>
        </div>
      )}

      {/* Top Bar Navigation & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 sm:px-5 rounded-xl border border-slate-200/80 shadow-2xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onResetImage}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 hover:text-slate-900 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Change Photo</span>
          </button>

          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-100/70 border border-blue-200/60 px-2 py-0.5 rounded-md shadow-2xs hidden sm:inline-block">
            Step 2 · Adjust &amp; Crop
          </span>

          <div className="text-xs text-slate-500 hidden md:block truncate max-w-xs">
            <span className="font-medium text-slate-800">{image.name}</span>
            <span className="ml-1.5 text-slate-400">
              ({image.width} × {image.height}px)
            </span>
          </div>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsShortcutsOpen(true)}
            className="inline-flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs sm:text-sm font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
            title="Keyboard Shortcuts (R to reset, Ctrl+S for A4 layout)"
          >
            <Keyboard className="w-3.5 h-3.5 text-slate-600" />
            <span className="hidden md:inline">Shortcuts</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadSinglePhoto}
            disabled={isExporting || isPreparingPrint}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
            title="Download single cropped photo file"
          >
            {isExporting ? (
              <div className="w-4 h-4 border-2 border-slate-600 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Download className="w-4 h-4 text-slate-600" />
            )}
            <span className="hidden sm:inline">Export Photo (600 DPI)</span>
            <span className="sm:hidden">Export</span>
          </button>

          <button
            type="button"
            onClick={handleOpenA4Layout}
            disabled={isPreparingPrint || isExporting}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            title={`A4 Layout & Print (${isMac ? 'Cmd+S' : 'Ctrl+S'})`}
          >
            {isPreparingPrint ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Printer className="w-4 h-4" />
            )}
            <span>A4 Layout &amp; Print</span>
            <kbd className="hidden lg:inline-block px-1.5 py-0.5 bg-blue-700/60 border border-blue-400/30 rounded text-[10px] font-mono text-blue-100 font-normal">
              {isMac ? '⌘S' : 'Ctrl+S'}
            </kbd>
          </button>
        </div>
      </div>

      {/* Visual Indicator: Face Detection Alert Banner */}
      {faceDetectionNotice && faceDetectionNotice.show && (
        <div
          role="status"
          className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 text-xs sm:text-sm transition-all duration-200 ${
            faceDetectionNotice.detected
              ? 'bg-blue-50/90 border-blue-200 text-blue-900'
              : 'bg-slate-100 border-slate-200 text-slate-700'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {faceDetectionNotice.detected ? (
              <UserCheck className="w-4 h-4 text-blue-600 shrink-0" />
            ) : (
              <Scan className="w-4 h-4 text-slate-500 shrink-0" />
            )}
            <div>
              <span className="font-semibold block sm:inline">
                {faceDetectionNotice.detected
                  ? 'Face Detected & Auto-Aligned'
                  : 'Manual Framing Mode'}
              </span>
              <span className="sm:ml-1 text-slate-600">
                — {faceDetectionNotice.message}
              </span>
              <span className="hidden md:inline text-slate-400 text-xs ml-2">
                (You can still manually drag, zoom, or rotate)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => runFaceDetection()}
              disabled={isDetectingFace}
              className="text-xs font-medium text-blue-600 hover:text-blue-800 bg-white/80 hover:bg-white px-2.5 py-1 rounded-md border border-blue-200 shadow-2xs transition-colors cursor-pointer"
            >
              {isDetectingFace ? 'Detecting...' : 'Re-Detect'}
            </button>
            <button
              type="button"
              onClick={() =>
                setFaceDetectionNotice((prev) => (prev ? { ...prev, show: false } : null))
              }
              aria-label="Dismiss face detection message"
              className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-black/5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {exportSuccessMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm rounded-lg flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>{exportSuccessMessage}</span>
        </div>
      )}

      {/* Main 2-Column Responsive Workspace */}
      {/* Desktop: LEFT: Large image editor, RIGHT: Controls */}
      {/* Mobile: Editor first, Controls underneath */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Large Image Editor (col-span 7 on large screens) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
          <CropWorkspace
            image={image}
            editorState={editorState}
            onPanChange={handlePanChange}
            onZoomChange={handleZoomChange}
            onToggleGuide={handleToggleGuide}
            onResetPosition={handleResetFraming}
            onDimensionsCalculated={handleDimensionsCalculated}
          />
        </div>

        {/* RIGHT COLUMN: Controls (col-span 5 on large screens) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Ratio / Format Selection Card */}
          <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Photo Format / Ratio
              </label>
              <span className="text-xs text-blue-600 font-medium">
                Default: 35 × 45 mm
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {ASPECT_RATIO_PRESETS.map((preset) => {
                const isSelected = editorState.aspectPreset.id === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handlePresetSelect(preset)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/50 ring-1 ring-blue-600/30'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="text-xs font-bold text-slate-900 flex items-center justify-between">
                      <span>{preset.name}</span>
                      {isSelected && (
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-600 inline-block" />
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1 line-clamp-1">
                      {preset.description}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Framing Controls Card (Zoom, Rotate & Auto-Detect) */}
          <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Crop &amp; Transform
              </h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => runFaceDetection()}
                  disabled={isDetectingFace}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 cursor-pointer"
                  title="Run automatic face detection and centering"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>{isDetectingFace ? 'Aligning...' : 'Auto-Center Face'}</span>
                </button>
                <span className="text-slate-200">|</span>
                <button
                  type="button"
                  onClick={handleResetFraming}
                  className="text-xs text-slate-500 hover:text-blue-600 font-medium flex items-center gap-1 cursor-pointer"
                  title="Reset zoom, rotation, and position"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset</span>
                </button>
              </div>
            </div>

            {/* Zoom Control */}
            <ZoomControl
              zoom={editorState.zoom}
              onChange={handleZoomChange}
            />

            {/* Rotation Controls */}
            <RotationControls
              rotation={editorState.rotation}
              onRotateLeft={handleRotateLeft}
              onRotateRight={handleRotateRight}
            />
          </div>

          {/* Expandable Adjustments Card */}
          <AdjustmentPanel
            adjustments={editorState.adjustments}
            onChange={(adj) =>
              setEditorState((prev) => ({ ...prev, adjustments: adj }))
            }
            onResetAdjustments={handleResetAdjustments}
          />

          {/* Quick Print Callout Card */}
          <div className="p-4 bg-slate-50/90 rounded-2xl border border-slate-200/80 flex items-center justify-between gap-3">
            <div>
              <h4 className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                <Printer className="w-3.5 h-3.5 text-blue-600" />
                Ready to Print Multiple Copies on A4?
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Arrange 6 or more copies with auto smart grid, custom spacing, and margins.
              </p>
            </div>
            <button
              type="button"
              onClick={handleOpenA4Layout}
              className="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors shrink-0 cursor-pointer"
            >
              A4 Layout
            </button>
          </div>
        </div>
      </div>

      {/* Subtle Privacy Notice */}
      <div className="flex items-center justify-center gap-1.5 text-xs text-slate-500 pt-1 pb-2 text-center">
        <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
        <span>Your photo is processed locally in your browser and is not uploaded to a server.</span>
      </div>
    </div>
  );
};
