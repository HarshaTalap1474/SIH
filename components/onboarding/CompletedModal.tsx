"use client";

import { CheckCircle2, ArrowRight, Video, Activity, ShieldCheck } from "lucide-react";
import { useTourStore } from "./useTourStore";

export function CompletedModal() {
  const { completeTour } = useTourStore();

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-complete-title"
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-md rounded-xl border border-slate-700/80 bg-[#0d131f] shadow-2xl p-6 sm:p-7 overflow-hidden text-slate-100 text-center">
        {/* Subtle accent glow top gradient */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600" />
        <div className="absolute -top-20 -left-20 h-40 w-40 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

        {/* Success Icon */}
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
          <CheckCircle2 className="h-8 w-8" />
        </div>

        {/* Headings */}
        <h2
          id="onboarding-complete-title"
          className="text-xl sm:text-2xl font-bold tracking-tight text-white mb-2"
        >
          You&apos;re all set!
        </h2>
        <p className="text-sm text-slate-300 mb-6 leading-relaxed">
          You can now monitor your HEMM fleet, inspect vehicle health and enter any vehicle&apos;s live cabin.
        </p>

        {/* Quick reminder tips */}
        <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3 mb-6 text-left space-y-2 text-xs">
          <div className="flex items-center gap-2 text-slate-300">
            <Activity className="h-3.5 w-3.5 text-amber-400 shrink-0" />
            <span>Click any map marker to view instant telemetry</span>
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <Video className="h-3.5 w-3.5 text-blue-400 shrink-0" />
            <span>Hover and click Cabin Preview for the 3D cabin simulator</span>
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
            <span>Access the Tour anytime using the Tour button in the header</span>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={completeTour}
          className="w-full px-5 py-2.5 rounded-lg text-sm font-bold text-black bg-amber-400 hover:bg-amber-300 shadow-md shadow-amber-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <span>Start Monitoring</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
