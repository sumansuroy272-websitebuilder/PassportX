import React from 'react';
import { Camera, ShieldCheck } from 'lucide-react';

export const Header: React.FC = () => {
  return (
    <header className="border-b border-slate-200/80 bg-white/95 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 sm:py-3.5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs shrink-0">
            <Camera className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 leading-none">
              Passport Printer
            </h1>
            <p className="text-[11px] sm:text-xs text-slate-500 font-normal mt-0.5">
              Create · Arrange · Print
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 text-[11px] sm:text-xs font-medium border border-emerald-200/80">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="hidden sm:inline">100% Private · In-Browser Processing</span>
            <span className="sm:hidden">Private</span>
          </div>
        </div>
      </div>
    </header>
  );
};
