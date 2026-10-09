"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";

export default function CabinRedirectPage() {
  const params = useParams();
  const vehicleId = (params?.vehicleId as string) || "D-03";
  const cabinBaseUrl = process.env.NEXT_PUBLIC_CABIN_URL || "http://localhost:3001";
  const targetUrl = `${cabinBaseUrl}?vehicle=${vehicleId}`;

  useEffect(() => {
    window.location.replace(targetUrl);
  }, [targetUrl]);

  return (
    <main className="fixed inset-0 flex flex-col items-center justify-center bg-zinc-950 font-sans text-white p-6 select-none">
      <div className="flex flex-col items-center max-w-md text-center gap-4 p-8 rounded-xl border border-slate-800 bg-slate-900/90 shadow-2xl">
        <div className="relative flex h-12 w-12 items-center justify-center rounded-xl border border-amber-500/40 bg-amber-500/15">
          <span className="font-mono text-lg font-black text-amber-400">W</span>
          <span className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full bg-emerald-400 animate-pulse" />
        </div>

        <div>
          <h2 className="text-base font-bold text-white uppercase tracking-wider">
            Opening Live Cabin
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Navigating to Live Cabin application for HEMM <span className="font-mono text-amber-400 font-bold">{vehicleId}</span>
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-full border border-slate-800 bg-slate-950 px-3 py-1 font-mono text-[11px] text-slate-400">
          <span className="h-2 w-2 rounded-full bg-blue-400 animate-ping" />
          <span>{targetUrl}</span>
        </div>

        <a
          href={targetUrl}
          className="mt-2 inline-flex items-center justify-center gap-2 rounded-md bg-blue-600 hover:bg-blue-500 px-5 py-2.5 text-xs font-bold text-white shadow-lg transition"
        >
          Open Live Cabin Directly →
        </a>
      </div>
    </main>
  );
}
