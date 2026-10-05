import React from 'react';

export const Header: React.FC = () => {
  return (
    <header className="border-b border-slate-200/80 bg-white/90 backdrop-blur-xs">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block" />
            PassportX
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-normal tracking-wide mt-0.5">
            Create. Arrange. Print.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 hidden sm:inline">
            Local browser processing · Private & secure
          </span>
        </div>
      </div>
    </header>
  );
};
