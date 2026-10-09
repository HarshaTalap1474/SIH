"use client";

import { ReactNode } from "react";
import { Truck, AlertTriangle, Route, Gauge, ShieldCheck } from "lucide-react";
import { useFleetStore } from "@/lib/fleetStore";

interface KpiItemProps {
  icon: ReactNode;
  title: string;
  value: string | number;
  subtext: ReactNode;
}

function KpiItem({ icon, title, value, subtext }: KpiItemProps) {
  return (
    <div className="flex flex-col justify-between rounded-lg border border-slate-800/90 bg-[#0d131f] px-3 py-2 transition-colors hover:border-slate-700/80">
      {/* Top Title & Icon */}
      <div className="flex items-center justify-between gap-1.5">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 truncate">
          {title}
        </span>
        <div className="shrink-0">{icon}</div>
      </div>

      {/* Main Stat Value */}
      <div className="my-0.5">
        <span className="font-mono text-lg lg:text-xl font-bold tracking-tight text-white leading-none">
          {value}
        </span>
      </div>

      {/* Supporting Context */}
      <div className="text-[10px] text-slate-400 flex items-center gap-1.5 truncate">
        {subtext}
      </div>
    </div>
  );
}

export function KpiCard() {
  const { kpis } = useFleetStore();

  return (
    <div
      data-tour="kpi-cards"
      className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 w-full shrink-0"
    >
      {/* 1. Total HEMMs */}
      <KpiItem
        icon={<Truck className="h-3.5 w-3.5 text-blue-400" />}
        title="Total HEMMs"
        value={kpis.totalDumpers}
        subtext={
          <>
            <span className="font-semibold text-emerald-400">{kpis.onlineDumpers} Online</span>
            <span className="text-slate-600">|</span>
            <span className="font-semibold text-rose-400">{kpis.offlineDumpers} Offline</span>
          </>
        }
      />

      {/* 2. Active Alerts */}
      <KpiItem
        icon={<AlertTriangle className="h-3.5 w-3.5 text-rose-400" />}
        title="Active Alerts"
        value={kpis.activeAlerts}
        subtext={
          <>
            <span className="font-semibold text-rose-400">{kpis.criticalAlerts} Critical</span>
            <span className="text-slate-600">|</span>
            <span className="font-semibold text-amber-400">{kpis.warningAlerts} Warning</span>
          </>
        }
      />

      {/* 3. Total Distance */}
      <KpiItem
        icon={<Route className="h-3.5 w-3.5 text-cyan-400" />}
        title="Total Distance"
        value={`${kpis.totalDistanceToday} km`}
        subtext={
          <span className="font-medium text-emerald-400">
            +{kpis.distanceVsYesterday}% vs yesterday
          </span>
        }
      />

      {/* 4. Average Speed */}
      <KpiItem
        icon={<Gauge className="h-3.5 w-3.5 text-teal-400" />}
        title="Average Speed"
        value={`${kpis.avgSpeed} km/h`}
        subtext={
          <span className="font-medium text-emerald-400">
            {kpis.speedLimitStatus}
          </span>
        }
      />

      {/* 5. System Uptime */}
      <KpiItem
        icon={<ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />}
        title="System Uptime"
        value={`${kpis.systemUptime}%`}
        subtext={
          <span className="font-medium text-emerald-400">
            {kpis.systemStatus}
          </span>
        }
      />
    </div>
  );
}
