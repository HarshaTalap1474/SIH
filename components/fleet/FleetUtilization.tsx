"use client";

import { PieChart } from "lucide-react";
import { FLEET_UTILIZATION } from "@/lib/fleetData";

export function FleetUtilization() {
  const { rate, runningCount, runningPct, idleCount, idlePct, offlineCount, offlinePct } =
    FLEET_UTILIZATION;

  const radius = 38;
  const circumference = 2 * Math.PI * radius;

  const runningLength = (runningPct / 100) * circumference;
  const idleLength = (idlePct / 100) * circumference;
  const offlineLength = (offlinePct / 100) * circumference;

  const runningOffset = 0;
  const idleOffset = -runningLength;
  const offlineOffset = -(runningLength + idleLength);

  return (
    <div className="rounded-lg border border-slate-800 bg-[#0a0f18] p-3.5 shadow-md flex flex-col justify-between">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <PieChart className="h-3.5 w-3.5 text-emerald-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Fleet Utilization
          </h3>
        </div>
        <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.2 rounded">
          Optimal
        </span>
      </div>

      <div className="flex items-center justify-around py-1">
        {/* SVG Donut Chart */}
        <div className="relative flex items-center justify-center">
          <svg className="h-28 w-28 -rotate-90 transform" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r={radius}
              className="stroke-slate-800/80"
              strokeWidth="9"
              fill="transparent"
            />
            <circle
              cx="50"
              cy="50"
              r={radius}
              stroke="#10b981"
              strokeWidth="9"
              strokeDasharray={`${runningLength} ${circumference}`}
              strokeDashoffset={runningOffset}
              fill="transparent"
              strokeLinecap="round"
            />
            <circle
              cx="50"
              cy="50"
              r={radius}
              stroke="#f59e0b"
              strokeWidth="9"
              strokeDasharray={`${idleLength} ${circumference}`}
              strokeDashoffset={idleOffset}
              fill="transparent"
            />
            <circle
              cx="50"
              cy="50"
              r={radius}
              stroke="#475569"
              strokeWidth="9"
              strokeDasharray={`${offlineLength} ${circumference}`}
              strokeDashoffset={offlineOffset}
              fill="transparent"
            />
          </svg>

          {/* Center Text */}
          <div className="absolute flex flex-col items-center justify-center text-center">
            <span className="text-xl font-bold font-mono text-white leading-none">
              {rate}%
            </span>
            <span className="text-[9px] text-slate-400 mt-0.5">
              Active
            </span>
          </div>
        </div>

        {/* Legend */}
        <div className="space-y-1.5 text-xs">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-slate-300 text-[11px]">Running</span>
            </div>
            <span className="font-mono text-xs text-white">
              {runningCount} <span className="text-slate-500 text-[10px]">({runningPct}%)</span>
            </span>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              <span className="text-slate-300 text-[11px]">Idle</span>
            </div>
            <span className="font-mono text-xs text-white">
              {idleCount} <span className="text-slate-500 text-[10px]">({idlePct}%)</span>
            </span>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-slate-500" />
              <span className="text-slate-300 text-[11px]">Offline</span>
            </div>
            <span className="font-mono text-xs text-white">
              {offlineCount} <span className="text-slate-500 text-[10px]">({offlinePct}%)</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
