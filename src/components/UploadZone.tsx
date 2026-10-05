import React, { useRef, useState } from 'react';
import { Upload, AlertCircle, Sparkles, Image as ImageIcon, ShieldCheck } from 'lucide-react';
import {
  validateImageFile,
  loadImageElement,
  optimizeImageIfNeeded,
  createSamplePortraitDataUrl,
} from '../utils/imageProcessing';
import { UploadedImage } from '../types/passport';

interface UploadZoneProps {
  onImageLoaded: (image: UploadedImage) => void;
  onError: (msg: string) => void;
  errorMessage?: string | null;
  onClearError: () => void;
}

export const UploadZone: React.FC<UploadZoneProps> = ({
  onImageLoaded,
  onError,
  errorMessage,
  onClearError,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const processFile = async (file: File) => {
    onClearError();
    const validation = validateImageFile(file);
    if (!validation.valid) {
      onError('Please upload a JPG, JPEG or PNG image.');
      return;
    }

    setIsLoading(true);
    let tempUrl: string | null = null;

    try {
      tempUrl = URL.createObjectURL(file);
      const imgElement = await loadImageElement(tempUrl);

      // Safe downscale if extremely large (e.g. >3200px)
      const optimized = await optimizeImageIfNeeded(file, imgElement);

      onImageLoaded({
        file,
        rawUrl: optimized.url,
        name: file.name,
        size: file.size,
        width: optimized.width,
        height: optimized.height,
      });
    } catch (err: any) {
      console.error('Image loading error:', err);
      onError('This image could not be processed. Please try another image.');
    } finally {
      if (tempUrl) {
        URL.revokeObjectURL(tempUrl);
      }
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
    // reset input so same file can be selected if needed
    if (e.target) {
      e.target.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (!files || files.length === 0) {
      onError('No file detected. Please drop a valid image file.');
      return;
    }

    processFile(files[0]);
  };

  const handleSamplePhoto = async () => {
    onClearError();
    setIsLoading(true);
    try {
      const dataUrl = await createSamplePortraitDataUrl();
      const imgElement = await loadImageElement(dataUrl);

      // Convert dataUrl to blob
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const sampleFile = new File([blob], 'sample-portrait.jpg', { type: 'image/jpeg' });

      onImageLoaded({
        file: sampleFile,
        rawUrl: dataUrl,
        name: 'sample-portrait.jpg',
        size: blob.size,
        width: imgElement.naturalWidth,
        height: imgElement.naturalHeight,
      });
    } catch (err: any) {
      onError('Failed to generate sample portrait.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      {errorMessage && (
        <div
          role="alert"
          className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3 transition-all"
        >
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-amber-900">Upload Note</h4>
            <p className="text-sm text-amber-800 mt-0.5">{errorMessage}</p>
          </div>
          <button
            type="button"
            onClick={onClearError}
            className="text-amber-600 hover:text-amber-800 text-xs font-medium px-2 py-1 rounded hover:bg-amber-100"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Upload Box */}
      <div
        onClick={() => !isLoading && fileInputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-all duration-200 bg-white ${
          isDragging
            ? 'border-blue-600 bg-blue-50/50 shadow-md scale-[1.005]'
            : 'border-slate-300 hover:border-blue-500 hover:bg-slate-50/50 shadow-xs'
        } ${isLoading ? 'opacity-60 pointer-events-none' : ''}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".jpg,.jpeg,.png,image/jpeg,image/png"
          onChange={handleFileChange}
          className="hidden"
          id="photo-upload-input"
          aria-label="Upload photo input"
        />

        <div className="flex flex-col items-center justify-center">
          {/* Step 1 Badge */}
          <span className="mb-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200">
            Step 1 · Upload Photo
          </span>

          <div
            className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-colors ${
              isDragging ? 'bg-blue-600 text-white' : 'bg-slate-100 text-blue-600'
            }`}
          >
            {isLoading ? (
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Upload className="w-8 h-8" />
            )}
          </div>

          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">
            Upload Your Photo
          </h2>

          <p className="text-sm sm:text-base text-slate-500 mb-4">
            JPG, JPEG or PNG
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <span className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 shadow-xs transition-colors">
              Choose from Computer or Phone
            </span>
          </div>

          <p className="text-xs text-slate-400 mt-4">
            Drag & drop supported · All processing runs directly in your browser
          </p>
        </div>
      </div>

      {/* Subtle Privacy Notice */}
      <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-slate-500 text-center">
        <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
        <span>Your photo is processed locally in your browser and is not uploaded to a server.</span>
      </div>

      {/* Quick Sample Option */}
      <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-xl bg-slate-100/80 border border-slate-200/60 text-slate-700">
        <div className="flex items-center gap-2.5 text-xs sm:text-sm">
          <ImageIcon className="w-4 h-4 text-blue-600 shrink-0" />
          <span>Don&apos;t have a headshot handy right now?</span>
        </div>
        <button
          type="button"
          onClick={handleSamplePhoto}
          disabled={isLoading}
          className="w-full sm:w-auto px-3.5 py-1.5 rounded-lg text-xs font-medium bg-white text-slate-800 border border-slate-300 hover:border-blue-400 hover:text-blue-600 transition-colors shadow-2xs inline-flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          Load Sample Photo
        </button>
      </div>

      {/* Helpful Guidelines Card */}
      <div className="mt-8 border border-slate-200 bg-white rounded-xl p-5 shadow-2xs">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
          Passport Photo Tips
        </h3>
        <ul className="text-xs sm:text-sm text-slate-600 space-y-2">
          <li className="flex items-start gap-2">
            <span className="text-blue-600 font-bold">·</span>
            <span>Look directly at camera with a natural, neutral expression</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 font-bold">·</span>
            <span>Use plain, light-colored or white background with even lighting</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 font-bold">·</span>
            <span>Ensure both eyes are clearly open and visible without glare or heavy shadows</span>
          </li>
        </ul>
      </div>
    </div>
  );
};
