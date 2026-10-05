import React from 'react';

export type WorkflowStep = 'upload' | 'adjust' | 'layout' | 'download';

interface WorkflowIndicatorProps {
  currentStep: WorkflowStep;
  onStepClick?: (step: WorkflowStep) => void;
}

export const WorkflowIndicator: React.FC<WorkflowIndicatorProps> = ({
  currentStep,
  onStepClick,
}) => {
  const steps: { id: WorkflowStep; number: number; label: string }[] = [
    { id: 'upload', number: 1, label: 'Upload' },
    { id: 'adjust', number: 2, label: 'Adjust' },
    { id: 'layout', number: 3, label: 'Layout' },
    { id: 'download', number: 4, label: 'Download' },
  ];

  return (
    <nav
      aria-label="Workflow progress"
      className="no-print w-full flex items-center justify-center py-2.5 px-4 bg-slate-50/80 border-b border-slate-200/60"
    >
      <ol className="flex items-center gap-1.5 sm:gap-3 text-xs">
        {steps.map((step, idx) => {
          const isCurrent = currentStep === step.id;
          const isCompleted =
            (currentStep === 'adjust' && step.id === 'upload') ||
            (currentStep === 'layout' && (step.id === 'upload' || step.id === 'adjust')) ||
            (currentStep === 'download' && step.id !== 'download');

          const isClickable =
            Boolean(onStepClick) &&
            ((currentStep === 'adjust' && step.id === 'upload') ||
              (currentStep === 'layout' && (step.id === 'upload' || step.id === 'adjust')));

          return (
            <li key={step.id} className="flex items-center">
              <button
                type="button"
                disabled={!isClickable}
                onClick={() => isClickable && onStepClick?.(step.id)}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors ${
                  isCurrent
                    ? 'font-bold text-blue-700 bg-blue-100/70 border border-blue-300/60 shadow-2xs'
                    : isCompleted
                    ? 'font-medium text-slate-700 hover:text-slate-900 cursor-pointer'
                    : 'text-slate-400 font-normal cursor-default'
                }`}
              >
                <span
                  className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-mono tabular-nums ${
                    isCurrent
                      ? 'bg-blue-600 text-white'
                      : isCompleted
                      ? 'bg-slate-300 text-slate-800'
                      : 'bg-slate-200 text-slate-400'
                  }`}
                >
                  {step.number}
                </span>
                <span>{step.label}</span>
              </button>

              {idx < steps.length - 1 && (
                <span
                  aria-hidden="true"
                  className="mx-1 text-slate-300 select-none font-sans"
                >
                  →
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};
