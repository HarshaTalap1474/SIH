"use client";

import { X, ArrowRight, ShieldCheck, Radio, Truck, Sparkles } from "lucide-react";
import { useTourStore } from "./useTourStore";

export function WelcomeModal() {
  const { startTour, skipTour } = useTourStore();

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-welcome-title"
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-lg rounded-xl border border-slate-700/80 bg-[#0d131f] shadow-2xl p-6 sm:p-7 overflow-hidden text-slate-100">
        {/* Subtle accent glow top gradient */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600" />
        <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

        {/* Close / Skip button */}
        <button
          onClick={skipTour}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800 transition-colors"
          aria-label="Skip onboarding"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Brand Icon & Badge */}
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-amber-500/50 bg-amber-500/15 shadow-sm">
            <span className="font-mono text-base font-black text-amber-400">W</span>
            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-[#0d131f]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold tracking-wider uppercase text-amber-400">
                HEMM Fleet Platform
              </span>
              <span className="rounded bg-slate-800 border border-slate-700 px-1.5 py-0.2 text-[10px] text-slate-300">
                v2.4
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Mission-Critical Mining Safety</p>
          </div>
        </div>

        {/* Main Headings */}
        <h2
          id="onboarding-welcome-title"
          className="text-xl sm:text-2xl font-bold tracking-tight text-white mb-1.5"
        >
          Welcome to WEBUILDZ
        </h2>
        <p className="text-sm text-slate-300 mb-5 leading-relaxed">
          Let&apos;s take a quick tour of the HEMM Fleet Control Center.
        </p>

        {/* Feature summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-6 text-xs">
          <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3 flex flex-col justify-between">
            <div className="flex items-center gap-2 mb-1.5 text-amber-400">
              <Radio className="h-4 w-4 shrink-0" />
              <span className="font-semibold text-slate-200">Live Satellite</span>
            </div>
            <span className="text-[11px] text-slate-400">Real-time open pit fleet tracking & geofencing</span>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3 flex flex-col justify-between">
            <div className="flex items-center gap-2 mb-1.5 text-blue-400">
              <Truck className="h-4 w-4 shrink-0" />
              <span className="font-semibold text-slate-200">HEMM Telemetry</span>
            </div>
            <span className="text-[11px] text-slate-400">Speed, TTC, payload, clearance & sensor status</span>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3 flex flex-col justify-between">
            <div className="flex items-center gap-2 mb-1.5 text-emerald-400">
              <ShieldCheck className="h-4 w-4 shrink-0" />
              <span className="font-semibold text-slate-200">Digital Twin</span>
            </div>
            <span className="text-[11px] text-slate-400">Interactive 3D vehicle cabin simulation</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-800/80">
          <span className="text-xs text-slate-400 font-mono hidden sm:inline">
            7 quick steps • ~1 min
          </span>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              onClick={skipTour}
              className="flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800/70 border border-slate-800 transition-colors cursor-pointer"
            >
              Skip Tour
            </button>
            <button
              onClick={startTour}
              className="flex-1 sm:flex-initial px-5 py-2 rounded-lg text-xs font-bold text-black bg-amber-400 hover:bg-amber-300 shadow-md shadow-amber-500/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Start Tour</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
