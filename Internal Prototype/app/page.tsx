"use client";

import { useEffect } from "react";
import { Scene } from "@/components/Scene";
import { HUD } from "@/components/HUD";
import { TiltPad } from "@/components/TiltPad";
import { initKeys } from "@/lib/keys";
import { useSim } from "@/lib/simStore";

export default function Page() {
  useEffect(() => {
    initKeys({
      onC: () => useSim.getState().toggleCam(),
      onR: () => useSim.getState().resetSim(),
    });
  }, []);

  return (
    <main className="fixed inset-0 overflow-hidden">
      <Scene />
      <HUD />
      <TiltPad />
    </main>
  );
}