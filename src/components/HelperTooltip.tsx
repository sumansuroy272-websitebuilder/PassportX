import React, { useState, useRef, useEffect } from 'react';
import { HelpCircle, Info, X } from 'lucide-react';

interface HelperTooltipProps {
  title: string;
  content: string;
  optimalTip?: string;
  side?: 'top' | 'bottom';
  className?: string;
}

export const HelperTooltip: React.FC<HelperTooltipProps> = ({
  title,
  content,
  optimalTip,
  side = 'top',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on click outside or escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div
      ref={containerRef}
      className={`relative inline-flex items-center ${className}`}
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setIsOpen(false)}
        className="text-slate-400 hover:text-blue-600 focus:text-blue-600 focus:outline-none transition-colors p-0.5 rounded cursor-pointer"
        aria-label={`More information about ${title}`}
        aria-expanded={isOpen}
      >
        <HelpCircle className="w-3.5 h-3.5" />
      </button>

      {/* Tooltip Popover */}
      {isOpen && (
        <div
          role="tooltip"
          className={`absolute z-50 w-64 sm:w-72 p-3 bg-slate-900 text-white rounded-xl shadow-xl border border-slate-700/80 text-xs transition-opacity duration-150 animate-in fade-in pointer-events-auto ${
            side === 'top'
              ? 'bottom-full left-1/2 -translate-x-1/2 mb-2'
              : 'top-full left-1/2 -translate-x-1/2 mt-2'
          }`}
          style={{
            maxWidth: 'calc(100vw - 32px)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-800 font-semibold text-slate-100">
            <span className="flex items-center gap-1.5 text-xs text-blue-300">
              <Info className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              {title}
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-slate-200 p-0.5 rounded sm:hidden"
              aria-label="Close tooltip"
            >
              <X className="w-3 h-3" />
            </button>
          </div>

          {/* Description Content */}
          <p className="mt-1.5 text-slate-300 text-[11px] leading-relaxed">
            {content}
          </p>

          {/* Optimal Recommendation Callout */}
          {optimalTip && (
            <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-start gap-1.5 text-[11px] text-amber-200/90 font-medium">
              <span className="text-amber-400 shrink-0">★</span>
              <span>{optimalTip}</span>
            </div>
          )}

          {/* Subtle Arrow */}
          <div
            className={`absolute left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 border-slate-700 rotate-45 ${
              side === 'top'
                ? 'bottom-[-5px] border-r border-b'
                : 'top-[-5px] border-l border-t'
            }`}
          />
        </div>
      )}
    </div>
  );
};
