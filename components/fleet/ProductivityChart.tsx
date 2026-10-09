"use client";

import { BarChart2, TrendingUp, Clock } from "lucide-react";
import { useFleetStore } from "@/lib/fleetStore";

export function ProductivityChart() {
  const { vehicles, selectVehicle, selectedVehicleId } = useFleetStore();

  const primaryDumpers = vehicles.slice(0, 8);
  const maxDistance = Math.max(...primaryDumpers.map((v) => v.distanceToday), 45);

  return (
    <div className="rounded-lg border border-slate-800 bg-[#0a0f18] p-3.5 shadow-md flex flex-col justify-between">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <BarChart2 className="h-3.5 w-3.5 text-cyan-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Distance & Productivity
          </h3>
        </div>
        <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 border border-cyan-500/30 px-1.5 py-0.2 rounded">
          Today
        </span>
      </div>

      {/* Bar Chart Container */}
      <div className="py-1">
        <div className="flex items-end justify-between gap-1.5 h-24 px-1 pt-2 border-b border-slate-800">
          {primaryDumpers.map((dumper) => {
            const heightPct = Math.round((dumper.distanceToday / maxDistance) * 100);
            const isSelected = selectedVehicleId === dumper.id;

            return (
              <div
                key={dumper.id}
                onClick={() => selectVehicle(dumper.id)}
                className="flex-1 flex flex-col items-center gap-1 h-full justify-end cursor-pointer group"
              >
                {/* Distance Value tooltip on hover */}
                <span className="text-[8px] font-mono text-slate-400 group-hover:text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity">
                  {dumper.distanceToday}k
                </span>

                {/* Vertical Bar */}
                <div className="w-full max-w-[20px] bg-slate-800/80 rounded-t overflow-hidden relative h-full flex items-end">
                  <div
                    style={{ height: `${heightPct}%` }}
                    className={`w-full rounded-t transition-all duration-300 ${
                      isSelected
                        ? "bg-cyan-400"
                        : dumper.status === "critical"
                        ? "bg-rose-500"
                        : dumper.status === "warning"
                        ? "bg-amber-500"
                        : "bg-cyan-600 group-hover:bg-cyan-500"
                    }`}
                  />
                </div>

                {/* Dumper Label */}
                <span
                  className={`text-[9px] font-mono font-semibold transition-colors ${
                    isSelected ? "text-cyan-400 font-bold" : "text-slate-400 group-hover:text-slate-200"
                  }`}
                >
                  {dumper.id}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer Summary Stats */}
      <div className="grid grid-cols-2 gap-2 pt-2 text-xs border-t border-slate-800/80">
        <div className="flex items-center gap-1.5">
          <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
          <div>
            <div className="text-[9px] text-slate-400">Total Distance</div>
            <div className="font-mono font-bold text-white text-xs">248.6 km</div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 text-amber-400" />
          <div>
            <div className="text-[9px] text-slate-400">Avg Operating Hours</div>
            <div className="font-mono font-bold text-white text-xs">8.3 h</div>
          </div>
        </div>
      </div>
    </div>
  );
}
