"use client";

import { useEffect, useState } from "react";
import { Mountain, User, ChevronDown } from "lucide-react";
import { HelpTourButton } from "@/components/onboarding/HelpTourButton";

export function FleetHeader() {
  const [currentTime, setCurrentTime] = useState<string>("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const formatted =
        now.toLocaleDateString("en-GB", {
          weekday: "short",
          day: "2-digit",
          month: "short",
          year: "numeric",
        }) +
        " " +
        now.toLocaleTimeString("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        });
      setCurrentTime(formatted);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="sticky top-0 z-40 flex h-14 w-full items-center justify-between border-b border-slate-800 bg-[#090d16] px-4 lg:px-6 shrink-0">
      {/* LEFT: Brand Identity */}
      <div className="flex items-center gap-3">
        <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-amber-500/40 bg-amber-500/15">
          <span className="font-mono text-sm font-black text-amber-400">
            W
          </span>
          <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-400 ring-1 ring-[#090d16]" />
        </div>

        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold tracking-wider text-white uppercase">
              WEBUILDZ
            </span>
            <span className="rounded bg-amber-500/10 px-1 py-0.2 text-[9px] font-semibold text-amber-400 border border-amber-500/20">
              HEMM
            </span>
          </div>
          <span className="text-[10px] text-slate-400">
            HEMM Safety & Digital Twin
          </span>
        </div>
      </div>

      {/* CENTER: Operational Motto */}
      <div className="hidden xl:flex items-center gap-2.5 text-xs">
        <span className="font-semibold text-slate-200">From Mine to Minds</span>
        <span className="text-slate-600">|</span>
        <span className="text-slate-400">Safer Operations. Smarter Mines.</span>
      </div>

      {/* RIGHT: Platform Slogan, System Status, Clock & Profile */}
      <div className="flex items-center gap-4 lg:gap-5">
        {/* Slogan */}
        <div className="hidden lg:flex items-center gap-2 text-xs text-slate-400">
          <span>One Platform. Complete Visibility.</span>
          <Mountain className="h-3.5 w-3.5 text-slate-500" />
        </div>

        {/* System Online Status */}
        <div className="hidden sm:flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-950/40 px-2.5 py-0.5 text-[11px] font-medium text-emerald-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          <span>System Online</span>
        </div>

        {/* Real-time Clock */}
        <div className="hidden md:flex flex-col text-right">
          <span className="font-mono text-xs font-semibold text-slate-200">
            {currentTime || "Thu, 24 Sep 2026 15:24:18"}
          </span>
          <span className="text-[9px] text-slate-500">IST (UTC +5:30)</span>
        </div>

        {/* Help & Replay Tour */}
        <HelpTourButton />

        {/* Admin Profile Pill */}
        <div className="flex items-center gap-2 rounded-md border border-slate-800 bg-slate-900/90 py-1 px-2.5 hover:border-slate-700 transition cursor-pointer">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 text-slate-300">
            <User className="h-3.5 w-3.5" />
          </div>
          <div className="flex flex-col text-left">
            <span className="text-xs font-medium text-white leading-tight">Admin</span>
            <span className="text-[9px] text-slate-400 leading-tight">Mine Control Room</span>
          </div>
          <ChevronDown className="h-3 w-3 text-slate-400" />
        </div>
      </div>
    </header>
  );
}
