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
    { id: 'adjust', number: 2, label: 'Crop & Adjust' },
    { id: 'layout', number: 3, label: 'A4 Layout' },
    { id: 'download', number: 4, label: 'Print / Save' },
  ];

  return (
    <nav
      aria-label="Workflow progress"
      className="no-print w-full bg-slate-50 border-b border-slate-200/80 px-2 sm:px-4 py-2"
    >
      <div className="max-w-6xl mx-auto overflow-x-auto no-scrollbar">
        <ol className="flex items-center justify-start sm:justify-center gap-1 sm:gap-2 text-xs min-w-max px-2 py-0.5">
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
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all min-h-[38px] ${
                    isCurrent
                      ? 'font-bold text-blue-700 bg-white border border-blue-300 shadow-xs'
                      : isCompleted
                      ? 'font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-200/60 cursor-pointer'
                      : 'text-slate-400 font-normal cursor-default'
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold font-mono tabular-nums shrink-0 ${
                      isCurrent
                        ? 'bg-blue-600 text-white'
                        : isCompleted
                        ? 'bg-slate-300 text-slate-800'
                        : 'bg-slate-200 text-slate-400'
                    }`}
                  >
                    {step.number}
                  </span>
                  <span className="whitespace-nowrap text-xs">{step.label}</span>
                </button>

                {idx < steps.length - 1 && (
                  <span
                    aria-hidden="true"
                    className="mx-1 text-slate-300 select-none font-sans font-bold"
                  >
                    →
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </nav>
  );
};
