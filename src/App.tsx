/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Header } from './components/Header';
import { UploadZone } from './components/UploadZone';
import { ImageEditor } from './components/ImageEditor';
import { WorkflowIndicator, WorkflowStep } from './components/WorkflowIndicator';
import { UploadedImage } from './types/passport';

export default function App() {
  const [currentImage, setCurrentImage] = useState<UploadedImage | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [workflowStep, setWorkflowStep] = useState<WorkflowStep>('upload');

  const handleImageLoaded = (image: UploadedImage) => {
    setCurrentImage(image);
    setWorkflowStep('adjust');
    setErrorMessage(null);
  };

  const handleError = (msg: string) => {
    setErrorMessage(msg);
  };

  const handleClearError = () => {
    setErrorMessage(null);
  };

  const handleResetImage = () => {
    if (currentImage?.rawUrl && currentImage.rawUrl.startsWith('blob:')) {
      URL.revokeObjectURL(currentImage.rawUrl);
    }
    setCurrentImage(null);
    setWorkflowStep('upload');
    setErrorMessage(null);
  };

  const handleStepClick = (step: WorkflowStep) => {
    if (step === 'upload') {
      handleResetImage();
    } else if (step === 'adjust' && currentImage) {
      setWorkflowStep('adjust');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f8f9fa] text-slate-800 antialiased font-sans selection:bg-blue-100 selection:text-blue-900 overflow-x-hidden">
      {/* Top Header */}
      <Header />

      {/* Workflow Progress Indicator (Requirement 12) */}
      <WorkflowIndicator
        currentStep={workflowStep}
        onStepClick={handleStepClick}
      />

      {/* Main Content Viewport */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-3 sm:px-6 py-4 sm:py-6 flex flex-col">
        {!currentImage ? (
          <div className="flex-1 flex flex-col justify-center py-4">
            <UploadZone
              onImageLoaded={handleImageLoaded}
              onError={handleError}
              errorMessage={errorMessage}
              onClearError={handleClearError}
            />
          </div>
        ) : (
          <ImageEditor
            image={currentImage}
            onResetImage={handleResetImage}
            onStepChange={(step) => setWorkflowStep(step)}
          />
        )}
      </main>

      {/* Minimal unobtrusive footer */}
      <footer className="no-print border-t border-slate-200/60 bg-white/50 py-4 text-center text-xs text-slate-400">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Passport Printer · Professional Passport Photo &amp; Print Studio</span>
          <span>100% Client-Side Processing · No Server Storage</span>
        </div>
      </footer>
    </div>
  );
}
