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
  Wand2,
  Eye,
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
import { BackgroundChanger } from './BackgroundChanger';
import { A4PrintLayout } from './A4PrintLayout';
import { ShortcutsModal } from './ShortcutsModal';
import { PrintPreviewModal } from './PrintPreviewModal';
import { renderHighResPhoto, loadImageElement } from '../utils/imageProcessing';
import { detectPrimaryFace, calculatePassportAutoCrop } from '../utils/faceDetection';
import {
  BgColorPreset,
  removeAndReplaceBackground,
  BgRemovalOptions,
  clearBackgroundMaskCache,
} from '../utils/backgroundRemoval';

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
  const [mobileTab, setMobileTab] = useState<'crop' | 'adjust'>('crop');
  const [preparedPhotoDataUrl, setPreparedPhotoDataUrl] = useState<string | null>(null);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [shortcutFeedback, setShortcutFeedback] = useState<string | null>(null);

  // Background removal & recoloring states (White, Sky Blue, Gray, etc.)
  const [processedImageUrl, setProcessedImageUrl] = useState<string | null>(null);
  const [currentBgPreset, setCurrentBgPreset] = useState<BgColorPreset>('original');
  const [customBgColor, setCustomBgColor] = useState<string>('#70B5F9');
  const [isRemovingBg, setIsRemovingBg] = useState<boolean>(false);
  const [bgTolerance, setBgTolerance] = useState<number>(35);
  const [bgSmoothness, setBgSmoothness] = useState<number>(2);
  const [bgStatusMessage, setBgStatusMessage] = useState<string | null>(null);

  // Print Preview Modal states
  const [isPrintPreviewOpen, setIsPrintPreviewOpen] = useState(false);
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState<string | null>(null);

  const isMac =
    typeof navigator !== 'undefined' &&
    /Mac|iPod|iPhone|iPad/.test(navigator.platform || '');

  // Clear AI mask cache when user loads new photo
  useEffect(() => {
    clearBackgroundMaskCache();
    setProcessedImageUrl(null);
    setCurrentBgPreset('original');
  }, [image.rawUrl]);

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

  // Background Removal & Recoloring Handler (White, Sky Blue, Gray, etc.)
  const handleApplyBackground = async (
    preset: BgColorPreset,
    newCustomColor?: string,
    options?: Partial<BgRemovalOptions>
  ) => {
    if (preset === 'original') {
      setProcessedImageUrl(null);
      setCurrentBgPreset('original');
      setBgStatusMessage('Original background restored (আসল পটভূমি সক্রিয়)');
      setTimeout(() => setBgStatusMessage(null), 3500);
      return;
    }

    try {
      setIsRemovingBg(true);
      const colorToUse = newCustomColor || customBgColor;
      if (newCustomColor) {
        setCustomBgColor(newCustomColor);
      }

      const tol = options?.tolerance ?? bgTolerance;
      const sm = options?.smoothness ?? bgSmoothness;

      const result = await removeAndReplaceBackground(
        image.rawUrl,
        {
          colorPreset: preset,
          customColor: colorToUse,
          tolerance: tol,
          smoothness: sm,
        },
        detectedFace
      );

      setProcessedImageUrl(result.dataUrl);
      setCurrentBgPreset(preset);

      const label =
        preset === 'white'
          ? 'White background applied (সাদা পটভূমি যুক্ত হয়েছে)'
          : preset === 'skyblue'
          ? 'Sky Blue background applied (আকাশি নীল পটভূমি যুক্ত হয়েছে)'
          : preset === 'gray'
          ? 'Studio Gray background applied (ধূসর পটভূমি)'
          : preset === 'transparent'
          ? 'Transparent cutout applied (স্বচ্ছ পটভূমি)'
          : 'Custom color background applied';

      setBgStatusMessage(label);
      setTimeout(() => setBgStatusMessage(null), 4000);
    } catch (err) {
      console.error('Failed to process background:', err);
      alert('Could not remove background. Please try adjusting tolerance.');
    } finally {
      setIsRemovingBg(false);
    }
  };

  const handleResetToOriginalBg = () => {
    handleApplyBackground('original');
  };

  // Generate cropped photo data URL
  const generateCroppedPhoto = async (): Promise<string> => {
    const activeUrl = processedImageUrl || image.rawUrl;
    const imgElement = await loadImageElement(activeUrl);

    const targetBg =
      currentBgPreset === 'skyblue'
        ? '#70B5F9'
        : currentBgPreset === 'white'
        ? '#FFFFFF'
        : currentBgPreset === 'gray'
        ? '#E2E8F0'
        : currentBgPreset === 'transparent'
        ? 'transparent'
        : currentBgPreset === 'custom'
        ? customBgColor
        : '#FFFFFF';

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
      backgroundColor: targetBg,
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

  // Open Print Preview Modal directly from editor
  const handleOpenPrintPreview = async () => {
    try {
      setIsPreparingPrint(true);
      const photo = await generateCroppedPhoto();
      setPreviewPhotoUrl(photo);
      setIsPrintPreviewOpen(true);
    } catch (err) {
      console.error('Failed to prepare photo for print preview:', err);
      alert('Could not render photo for print preview.');
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
      const isPng = currentBgPreset === 'transparent';
      const ext = isPng ? 'png' : 'jpg';
      link.download = `passport-photo-${editorState.aspectPreset.id}-${currentBgPreset}-${Date.now()}.${ext}`;
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
    <div className="w-full max-w-6xl mx-auto space-y-4 pb-28 lg:pb-8">
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

      {/* Top Bar Navigation & Actions (Sticky so buttons are always visible on scroll) */}
      <div className="no-print sticky top-12 sm:top-14 z-30 flex items-center justify-between gap-2 bg-white/95 backdrop-blur-md p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl border border-slate-200/90 shadow-sm">
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={onResetImage}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 hover:text-slate-900 transition-colors cursor-pointer min-h-[42px]"
          >
            <ArrowLeft className="w-4 h-4 shrink-0" />
            <span className="hidden xs:inline">Change Photo</span>
            <span className="xs:hidden">Change</span>
          </button>

          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-100/70 border border-blue-200/60 px-2 py-0.5 rounded-md shadow-2xs hidden md:inline-block">
            Step 2 · Crop &amp; Adjust
          </span>

          <div className="text-xs text-slate-500 hidden xl:block truncate max-w-xs">
            <span className="font-medium text-slate-800">{image.name}</span>
          </div>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* 1-Click Background Removal & Switcher Button */}
          <button
            type="button"
            onClick={() => handleApplyBackground(currentBgPreset === 'white' ? 'skyblue' : 'white')}
            disabled={isRemovingBg}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-bold border transition-all cursor-pointer min-h-[42px] ${
              currentBgPreset !== 'original'
                ? 'bg-blue-50 border-blue-400 text-blue-800 shadow-2xs'
                : 'bg-white border-slate-300 hover:bg-slate-50 text-slate-700'
            }`}
            title="1-click background removal (White & Sky Blue / সাদা ও আকাশি নীল)"
          >
            {isRemovingBg ? (
              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Wand2 className="w-4 h-4 text-blue-600 shrink-0" />
            )}
            <span className="hidden sm:inline">Remove BG</span>
            <span className="sm:hidden">BG</span>
            <span
              className="w-2.5 h-2.5 rounded-full border border-slate-300 shrink-0 shadow-2xs"
              style={{
                backgroundColor:
                  currentBgPreset === 'white'
                    ? '#FFFFFF'
                    : currentBgPreset === 'skyblue'
                    ? '#70B5F9'
                    : currentBgPreset === 'gray'
                    ? '#E2E8F0'
                    : currentBgPreset === 'transparent'
                    ? 'transparent'
                    : currentBgPreset === 'custom'
                    ? customBgColor
                    : '#94a3b8',
              }}
            />
          </button>

          <button
            type="button"
            onClick={() => setIsShortcutsOpen(true)}
            className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-xs sm:text-sm font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer min-h-[42px]"
            title="Keyboard Shortcuts (R to reset, Ctrl+S for A4 layout)"
          >
            <Keyboard className="w-3.5 h-3.5 text-slate-600" />
            <span>Shortcuts</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadSinglePhoto}
            disabled={isExporting || isPreparingPrint}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-2xs transition-colors cursor-pointer disabled:opacity-50 min-h-[42px]"
            title="Download single cropped photo file (600 DPI)"
          >
            {isExporting ? (
              <div className="w-4 h-4 border-2 border-slate-600 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Download className="w-4 h-4 text-slate-600 shrink-0" />
            )}
            <span className="hidden sm:inline">Export (600 DPI)</span>
            <span className="sm:hidden">Export</span>
          </button>

          <button
            type="button"
            onClick={handleOpenPrintPreview}
            disabled={isPreparingPrint || isExporting}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-2xs transition-colors cursor-pointer disabled:opacity-50 min-h-[42px]"
            title="Print Preview on standard A4 or 4x6 photo paper"
          >
            <Eye className="w-4 h-4 text-blue-600 shrink-0" />
            <span className="hidden sm:inline">Print Preview</span>
            <span className="sm:hidden">Preview</span>
          </button>

          <button
            type="button"
            onClick={handleOpenA4Layout}
            disabled={isPreparingPrint || isExporting}
            className="inline-flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-xs transition-colors cursor-pointer disabled:opacity-50 min-h-[42px]"
            title={`A4 Layout & Print (${isMac ? 'Cmd+S' : 'Ctrl+S'})`}
          >
            {isPreparingPrint ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Printer className="w-4 h-4 shrink-0" />
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

      {/* Background Status Alert Banner */}
      {bgStatusMessage && (
        <div className="p-3 bg-blue-50/95 border border-blue-200 text-blue-900 text-xs sm:text-sm rounded-xl flex items-center justify-between gap-2 shadow-2xs">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-blue-600 shrink-0" />
            <span className="font-semibold">{bgStatusMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setBgStatusMessage(null)}
            className="text-blue-500 hover:text-blue-700 p-1 rounded-md"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Mobile/Tablet Segmented View Switcher (lg:hidden) */}
      <div className="lg:hidden flex items-center p-1 bg-slate-200/90 rounded-2xl gap-1">
        <button
          type="button"
          onClick={() => setMobileTab('crop')}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 min-h-[42px] cursor-pointer ${
            mobileTab === 'crop'
              ? 'bg-white text-blue-700 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Crop className="w-4 h-4" />
          <span>1. Crop &amp; Position</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('adjust')}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 min-h-[42px] cursor-pointer ${
            mobileTab === 'adjust'
              ? 'bg-white text-blue-700 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>2. Format, BG &amp; Adjust</span>
        </button>
      </div>

      {/* Mobile Fast 1-Tap Background Buttons Row */}
      <div className="lg:hidden flex items-center justify-between p-2.5 bg-white rounded-xl border border-slate-200/90 shadow-2xs text-xs gap-2">
        <div className="flex items-center gap-1.5 font-bold text-slate-800 text-xs shrink-0">
          <Wand2 className="w-3.5 h-3.5 text-blue-600" />
          <span>BG (পটভূমি):</span>
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <button
            type="button"
            onClick={() => handleApplyBackground('white')}
            disabled={isRemovingBg}
            className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all ${
              currentBgPreset === 'white'
                ? 'bg-blue-50 border-blue-600 text-blue-700 ring-1 ring-blue-500'
                : 'bg-white border-slate-200 text-slate-700'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full border border-slate-300 bg-white shrink-0 shadow-2xs" />
            <span>White (সাদা)</span>
          </button>
          <button
            type="button"
            onClick={() => handleApplyBackground('skyblue')}
            disabled={isRemovingBg}
            className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all ${
              currentBgPreset === 'skyblue'
                ? 'bg-sky-50 border-sky-600 text-sky-800 ring-1 ring-sky-500'
                : 'bg-white border-slate-200 text-slate-700'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full border border-sky-400 bg-[#70B5F9] shrink-0 shadow-2xs" />
            <span>Sky Blue (আকাশি)</span>
          </button>
          <button
            type="button"
            onClick={handleResetToOriginalBg}
            disabled={currentBgPreset === 'original' || isRemovingBg}
            className="px-2 py-1.5 rounded-lg border border-slate-200 text-slate-600 text-xs font-medium hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
          >
            Original
          </button>
        </div>
      </div>

      {/* Main 2-Column Responsive Workspace */}
      {/* Desktop: LEFT: Large image editor, RIGHT: Controls */}
      {/* Mobile: Switch between tabs or scroll */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Large Image Editor (col-span 7 on large screens) */}
        <div className={`lg:col-span-7 bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden ${
          mobileTab === 'crop' ? 'block' : 'hidden lg:block'
        }`}>
          <CropWorkspace
            image={image}
            displayImageUrl={processedImageUrl || undefined}
            currentBgPreset={currentBgPreset}
            onQuickBgChange={handleApplyBackground}
            isRemovingBg={isRemovingBg}
            editorState={editorState}
            onPanChange={handlePanChange}
            onZoomChange={handleZoomChange}
            onToggleGuide={handleToggleGuide}
            onResetPosition={handleResetFraming}
            onDimensionsCalculated={handleDimensionsCalculated}
            onRotateLeft={handleRotateLeft}
            onRotateRight={handleRotateRight}
          />
        </div>

        {/* RIGHT COLUMN: Controls (col-span 5 on large screens) */}
        <div className={`lg:col-span-5 space-y-4 ${
          mobileTab === 'adjust' ? 'block' : 'hidden lg:block'
        }`}>
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

            <div className="grid grid-cols-2 gap-2.5">
              {ASPECT_RATIO_PRESETS.map((preset) => {
                const isSelected = editorState.aspectPreset.id === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handlePresetSelect(preset)}
                    className={`min-h-[54px] p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/70 ring-2 ring-blue-600/30'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="text-xs sm:text-sm font-bold text-slate-900 flex items-center justify-between">
                      <span>{preset.name}</span>
                      {isSelected ? (
                        <span className="w-2 h-2 rounded-full bg-blue-600 inline-block shrink-0" />
                      ) : null}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-1 font-medium">
                      {preset.description}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Background Changer Card (White & Sky Blue - সহজে পটভূমি পরিবর্তন) */}
          <BackgroundChanger
            currentPreset={currentBgPreset}
            customColor={customBgColor}
            isProcessing={isRemovingBg}
            onApplyBackground={handleApplyBackground}
            onResetToOriginal={handleResetToOriginalBg}
            tolerance={bgTolerance}
            onToleranceChange={setBgTolerance}
            smoothness={bgSmoothness}
            onSmoothnessChange={setBgSmoothness}
          />

          {/* Framing Controls Card (Zoom, Rotate & Auto-Detect) */}
          <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Crop &amp; Transform
              </h3>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <button
                  type="button"
                  onClick={() => runFaceDetection()}
                  disabled={isDetectingFace}
                  className="text-xs text-blue-700 bg-blue-50 hover:bg-blue-100 active:bg-blue-200 border border-blue-200/80 px-2.5 py-1.5 rounded-lg font-semibold flex items-center gap-1 cursor-pointer min-h-[34px] transition-colors"
                  title="Run automatic face detection and centering"
                >
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  <span>{isDetectingFace ? 'Aligning...' : 'Auto-Center'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleResetFraming}
                  className="text-xs text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 px-2.5 py-1.5 rounded-lg font-semibold flex items-center gap-1 cursor-pointer min-h-[34px] transition-colors"
                  title="Reset zoom, rotation, and position"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
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
          <div className="p-4 bg-slate-50/90 rounded-2xl border border-slate-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Printer className="w-3.5 h-3.5 text-blue-600" />
                Ready to Print Multiple Copies on A4 / 4×6 Paper?
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Preview exact paper layout, cutting guidelines, or arrange multiple copies on standard sheets.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleOpenPrintPreview}
                disabled={isPreparingPrint || isExporting}
                className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 shadow-2xs transition-colors cursor-pointer min-h-[38px] flex items-center justify-center gap-1.5"
                title="Preview photos on standard A4 or 4x6 photo paper"
              >
                <Eye className="w-3.5 h-3.5 text-blue-600" />
                <span>Preview Sheet</span>
              </button>
              <button
                type="button"
                onClick={handleOpenA4Layout}
                className="flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors shrink-0 cursor-pointer min-h-[38px]"
              >
                A4 Layout →
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Subtle Privacy Notice */}
      <div className="flex items-center justify-center gap-1.5 text-xs text-slate-500 pt-1 pb-2 text-center">
        <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
        <span>Your photo is processed locally in your browser and is not uploaded to a server.</span>
      </div>

      {/* Mobile Floating Sticky Bottom Action Bar */}
      <div className="no-print lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 px-3 py-2.5 shadow-2xl flex items-center gap-2">
        <button
          type="button"
          onClick={handleOpenPrintPreview}
          disabled={isExporting || isPreparingPrint}
          className="px-3 py-3 rounded-xl bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-800 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0 disabled:opacity-50 min-h-[48px] border border-slate-300 shadow-2xs"
          title="Print Preview on A4 / 4x6 photo paper"
        >
          <Eye className="w-4 h-4 text-blue-600 shrink-0" />
          <span>Preview</span>
        </button>

        <button
          type="button"
          onClick={handleDownloadSinglePhoto}
          disabled={isExporting || isPreparingPrint}
          className="px-3.5 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-800 text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0 disabled:opacity-50 min-h-[48px] border border-slate-200/80"
          title="Download single cropped photo (600 DPI)"
        >
          {isExporting ? (
            <div className="w-4 h-4 border-2 border-slate-600 border-t-transparent rounded-full animate-spin" />
          ) : (
            <Download className="w-4 h-4 text-slate-700 shrink-0" />
          )}
          <span>Export</span>
        </button>

        <button
          type="button"
          onClick={handleOpenA4Layout}
          disabled={isPreparingPrint || isExporting}
          className="flex-1 py-3 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer disabled:opacity-50 min-h-[48px]"
          title="Proceed to A4 Print Layout"
        >
          {isPreparingPrint ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Printer className="w-4 h-4 shrink-0" />
          )}
          <span>A4 Sheet →</span>
        </button>
      </div>

      {/* Print Preview Modal (Inspect exact A4 or 4x6 paper before printing) */}
      {previewPhotoUrl && (
        <PrintPreviewModal
          isOpen={isPrintPreviewOpen}
          onClose={() => setIsPrintPreviewOpen(false)}
          photoUrl={previewPhotoUrl}
          aspectPreset={editorState.aspectPreset}
          initialPaperSizeId="a4"
          initialOrientation="portrait"
          initialPhotoCount={6}
        />
      )}
    </div>
  );
};
