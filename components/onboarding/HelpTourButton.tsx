"use client";

import { useState, useRef, useEffect } from "react";
import { HelpCircle, Play, X, Compass, Keyboard } from "lucide-react";
import { useTourStore } from "./useTourStore";

export function HelpTourButton() {
  const { restartTour } = useTourStore();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isOpen]);

  const handleStartTour = () => {
    setIsOpen(false);
    restartTour();
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 rounded-md border border-slate-800 bg-slate-900/90 py-1 px-2 hover:border-amber-500/50 hover:bg-slate-800/80 text-slate-300 hover:text-white transition-all cursor-pointer text-xs"
        title="Help & Control Room Guide"
        aria-label="Help & Control Room Guide"
        aria-expanded={isOpen}
      >
        <HelpCircle className="h-3.5 w-3.5 text-amber-400" />
        <span className="hidden sm:inline font-medium">Help</span>
      </button>

      {/* Small Dropdown Popover */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-1.5 w-60 rounded-lg border border-slate-700 bg-[#0d131f] shadow-2xl p-2.5 z-50 text-xs animate-in fade-in-50 zoom-in-95">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 mb-2">
            <span className="font-bold text-white text-[11px] uppercase tracking-wider">
              Control Room Guide
            </span>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Primary Action: Take a Tour */}
          <button
            onClick={handleStartTour}
            className="w-full flex items-center gap-2 rounded-md bg-amber-400/10 border border-amber-500/30 px-2.5 py-2 text-left font-bold text-amber-400 hover:bg-amber-400 hover:text-black transition-all cursor-pointer group"
          >
            <Compass className="h-4 w-4 shrink-0 transition-transform group-hover:rotate-45" />
            <div className="flex-1">
              <span className="block leading-tight">Take a Tour</span>
              <span className="text-[10px] font-normal opacity-80 block leading-tight">
                7-step interactive walkthrough
              </span>
            </div>
            <Play className="h-3 w-3 fill-current opacity-70 group-hover:opacity-100" />
          </button>

          {/* Shortcut Hints */}
          <div className="mt-2.5 pt-2 border-t border-slate-800/80 space-y-1 text-[10px] text-slate-400">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Keyboard className="h-3 w-3 text-slate-500" />
                <span>Next / Back</span>
              </span>
              <span className="font-mono text-slate-300">→ / ←</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Exit Tour</span>
              <span className="font-mono text-slate-300">Esc</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
