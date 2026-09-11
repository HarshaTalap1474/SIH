"use client";

import { useEffect } from "react";
import { Header } from "@/components/Header";
import { DashboardPanel } from "@/components/DashboardPanel";
import { Scene } from "@/components/Scene";
import { Minimap } from "@/components/Minimap";
import { initKeys } from "@/lib/keys";
import { useSim } from "@/lib/simStore";

export default function Page() {
  useEffect(() => {
    initKeys({
      onC: () => useSim.getState().toggleCam(),
      onR: () => useSim.getState().resetSim(),
      onH: () => useSim.getState().toggleHeadlights(),
      onF: () => useSim.getState().toggleFog(),
      onT: () => useSim.getState().toggleRain(),
    });
  }, []);

  return (
    <main className="fixed inset-0 flex flex-col overflow-hidden bg-zinc-950 font-sans text-white select-none">
      {/* Zone 1: Top Header */}
      <Header />

      {/* Main Split: Zone 2 (Dashboard) + Zone 3 (3D Simulation) with Zone 4 (Minimap) */}
      <div className="relative flex flex-1 min-h-0 w-full overflow-hidden">
        <DashboardPanel />

        <section className="relative flex-1 h-full w-full overflow-hidden bg-stone-950">
          <Scene />
          <Minimap />
        </section>
      </div>
    </main>
  );
}