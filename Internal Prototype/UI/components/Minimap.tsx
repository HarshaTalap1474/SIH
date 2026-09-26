"use client";

import { useEffect, useRef, useState } from "react";
import { useSim } from "@/lib/simStore";
import {
  STOCKPILES,
  ROCK_SPOTS,
  PHYSICS,
  ROAD_SIGNS,
  LIGHT_TOWERS,
  getRoadEdgePoint,
  getRoadCenterline,
  getRoadLateralOffset,
  getRoadWidth,
  getTerrainElevation,
} from "@/lib/constants";

const WIDTH = 224;
const HEIGHT = 180;
const EXTRA_STOCKPILES = [
  [55, -67, 6],
  [48, -56, 5],
] as const;

const SPOIL_DUMPS = [
  { x: -65, z: -110, r: 22, name: "SPOIL 1" },
  { x: 75, z: -120, r: 24, name: "SPOIL 2" },
  { x: -85, z: 115, r: 26, name: "SPOIL 3" },
  { x: 80, z: 125, r: 28, name: "SPOIL 4" },
] as const;

/**
 * Returns human-readable zone / road segment name corresponding to world coordinates.
 */
function getRoadSegmentName(x: number, z: number): string {
  const { u } = getRoadLateralOffset(x, z);
  const halfW = getRoadWidth(z) * 0.5;
  const onRoad = Math.abs(u) <= halfW + 2.0;

  if (onRoad) {
    if (z < -145) return "HAUL ROAD • NORTH SUMMIT (+11M)";
    if (z < -85) return "HAUL ROAD • NORTH CANYON PASS";
    if (z < -50) return "HAUL ROAD • BASIN DESCENT RAMP";
    if (z < -10) return "HAUL ROAD • PIT BASELINE";
    if (z < 35) return "HAUL ROAD • CENTRAL SADDLE CURVE";
    if (z < 75) return "HAUL ROAD • SOUTH CANYON PASS";
    if (z < 145) return "HAUL ROAD • SOUTH SUMMIT (+12M)";
    return "HAUL ROAD • SOUTH PORTAL";
  } else {
    if (Math.hypot(x - 52, z - (-62)) < 26) return "ZONE • CRUSHER PLATFORM";
    if (Math.hypot(x - (-70), z - (-30)) < 28) return "ZONE • EXCAVATOR EX-01 BASIN";
    if (Math.hypot(x - (-55), z - 35) < 22) return "ZONE • DRAINAGE SUMP";
    if (u < 0) return "PIT BASIN • OFF-ROAD BENCH";
    return "HIGHWALL FLANK • OFF-ROAD";
  }
}

export function Minimap() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [rangeMode, setRangeMode] = useState<75 | 110>(75);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = WIDTH * dpr;
    canvas.height = HEIGHT * dpr;
    ctx.scale(dpr, dpr);

    let animId: number;

    const render = () => {
      const { x: truckX, z: truckZ, yaw, steer } = useSim.getState();
      const cx = WIDTH / 2;
      const cy = HEIGHT * 0.54;
      const rangeM = rangeMode;
      const scale = (HEIGHT * 0.48) / rangeM; // pixels per meter

      ctx.clearRect(0, 0, WIDTH, HEIGHT);

      // 1. Background tactical topography grid
      ctx.fillStyle = "#14100e";
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      // Subtle tactical grid lines (20m world grid aligned)
      ctx.strokeStyle = "rgba(255, 255, 255, 0.04)";
      ctx.lineWidth = 1;
      const gridStep = 20 * scale;
      const startGx = ((cx - truckX * scale) % gridStep + gridStep) % gridStep;
      const startGy = ((cy - truckZ * scale) % gridStep + gridStep) % gridStep;
      for (let gx = startGx; gx < WIDTH; gx += gridStep) {
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, HEIGHT);
        ctx.stroke();
      }
      for (let gy = startGy; gy < HEIGHT; gy += gridStep) {
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(WIDTH, gy);
        ctx.stroke();
      }

      // 2. World Coordinate Transformation: Heading-Up
      // Truck is placed at (cx, cy) pointing UP, world rotates by truck heading
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(yaw);
      ctx.scale(scale, scale);
      ctx.translate(-truckX, -truckZ);

      // A. Outer Pit Perimeter (185m drivable boundary)
      ctx.beginPath();
      ctx.arc(0, 0, 185, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(120, 53, 15, 0.35)";
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // B. Terraced Open-Pit Bench Contours (Catch benches at depth)
      ctx.strokeStyle = "rgba(87, 52, 34, 0.45)";
      ctx.lineWidth = 1.2;
      ctx.setLineDash([4, 6]);
      for (const r of [125, 140, 156, 172]) {
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.setLineDash([]);

      // C. Spoil Dumps / Overburden Waste Rock Mountains
      for (const sd of SPOIL_DUMPS) {
        // Base cone
        ctx.beginPath();
        ctx.arc(sd.x, sd.z, sd.r, 0, Math.PI * 2);
        ctx.fillStyle = "#2c170f";
        ctx.fill();
        ctx.strokeStyle = "#78350f";
        ctx.lineWidth = 1.2;
        ctx.stroke();

        // Inner ridge contour
        ctx.beginPath();
        ctx.arc(sd.x, sd.z, sd.r * 0.55, 0, Math.PI * 2);
        ctx.fillStyle = "#3e2015";
        ctx.fill();
        ctx.strokeStyle = "#92400e";
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }

      // D. Central Mountain Spur at (26, 8)
      ctx.beginPath();
      ctx.arc(26, 8, 15, 0, Math.PI * 2);
      ctx.fillStyle = "#351c12";
      ctx.fill();
      ctx.strokeStyle = "#854d0e";
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // Inner spur peak
      ctx.beginPath();
      ctx.arc(26, 8, 8, 0, Math.PI * 2);
      ctx.fillStyle = "#4a2619";
      ctx.fill();
      ctx.stroke();

      // E. Canyon Cut Highwall Hazard Zones (Carved vertical mountain rock faces)
      // Left highwall in canyon cut (z in [-115, -70])
      ctx.beginPath();
      for (let rz = -115; rz <= -70; rz += 4) {
        const pt = getRoadEdgePoint(rz, -11.5);
        if (rz === -115) ctx.moveTo(pt.x, pt.z);
        else ctx.lineTo(pt.x, pt.z);
      }
      for (let rz = -70; rz >= -115; rz -= 4) {
        const pt = getRoadEdgePoint(rz, -26.0);
        ctx.lineTo(pt.x, pt.z);
      }
      ctx.closePath();
      ctx.fillStyle = "rgba(120, 53, 15, 0.4)";
      ctx.fill();

      // Right highwall in canyon cut (z in [-115, -70])
      ctx.beginPath();
      for (let rz = -115; rz <= -70; rz += 4) {
        const pt = getRoadEdgePoint(rz, 11.5);
        if (rz === -115) ctx.moveTo(pt.x, pt.z);
        else ctx.lineTo(pt.x, pt.z);
      }
      for (let rz = -70; rz >= -115; rz -= 4) {
        const pt = getRoadEdgePoint(rz, 26.0);
        ctx.lineTo(pt.x, pt.z);
      }
      ctx.closePath();
      ctx.fillStyle = "rgba(120, 53, 15, 0.4)";
      ctx.fill();

      // Highwall along East mountain flank (z in [-50, 40])
      ctx.beginPath();
      for (let rz = -50; rz <= 40; rz += 5) {
        const pt = getRoadEdgePoint(rz, 11.5);
        if (rz === -50) ctx.moveTo(pt.x, pt.z);
        else ctx.lineTo(pt.x, pt.z);
      }
      for (let rz = 40; rz >= -50; rz -= 5) {
        const pt = getRoadEdgePoint(rz, 28.0);
        ctx.lineTo(pt.x, pt.z);
      }
      ctx.closePath();
      ctx.fillStyle = "rgba(120, 53, 15, 0.35)";
      ctx.fill();

      // F. Silt Drainage Pond at (-55, 35) (Restricted Water Hazard)
      ctx.beginPath();
      ctx.arc(-55, 35, 11.5, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(15, 118, 110, 0.75)";
      ctx.fill();
      ctx.strokeStyle = "#14b8a6";
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // Inner ripple ring
      ctx.beginPath();
      ctx.arc(-55, 35, 6, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(94, 234, 212, 0.5)";
      ctx.lineWidth = 0.8;
      ctx.stroke();

      // G. Primary Crusher Platform & Loading Ramp at (52, -62)
      ctx.beginPath();
      ctx.arc(52, -62, 13, 0, Math.PI * 2);
      ctx.fillStyle = "#3e281b";
      ctx.fill();
      ctx.strokeStyle = "#b45309";
      ctx.lineWidth = 1.4;
      ctx.stroke();

      // Crusher loading ramp (accessible from road opening at z=[-72, -52])
      ctx.fillStyle = "#2c1c13";
      ctx.fillRect(28, -66.5, 16, 9);
      ctx.strokeStyle = "#78350f";
      ctx.strokeRect(28, -66.5, 16, 9);

      // H. Synchronized True 3D Haul Road Network (18m wide, tapering in passes)
      // 1. Road bed base
      ctx.beginPath();
      for (let rz = -200; rz <= 200; rz += 3) {
        const hw = getRoadWidth(rz) * 0.5;
        const pt = getRoadEdgePoint(rz, -hw);
        if (rz === -200) ctx.moveTo(pt.x, pt.z);
        else ctx.lineTo(pt.x, pt.z);
      }
      for (let rz = 200; rz >= -200; rz -= 3) {
        const hw = getRoadWidth(rz) * 0.5;
        const pt = getRoadEdgePoint(rz, hw);
        ctx.lineTo(pt.x, pt.z);
      }
      ctx.closePath();
      ctx.fillStyle = "#241e1b";
      ctx.fill();

      // 2. Continuous Earthen Safety Berm Lines (with excavator & crusher ramp openings)
      ctx.strokeStyle = "rgba(120, 53, 15, 0.7)";
      ctx.lineWidth = 1.6;
      // Left Berm segment 1 (z = -190 to -38)
      ctx.beginPath();
      for (let rz = -190; rz <= -38; rz += 4) {
        const hw = getRoadWidth(rz) * 0.5 + 0.8;
        const pt = getRoadEdgePoint(rz, -hw);
        if (rz === -190) ctx.moveTo(pt.x, pt.z);
        else ctx.lineTo(pt.x, pt.z);
      }
      ctx.stroke();
      // Left Berm segment 2 (z = -22 to 190)
      ctx.beginPath();
      for (let rz = -22; rz <= 190; rz += 4) {
        const hw = getRoadWidth(rz) * 0.5 + 0.8;
        const pt = getRoadEdgePoint(rz, -hw);
        if (rz === -22) ctx.moveTo(pt.x, pt.z);
        else ctx.lineTo(pt.x, pt.z);
      }
      ctx.stroke();

      // Right Berm segment 1 (z = -190 to -72)
      ctx.beginPath();
      for (let rz = -190; rz <= -72; rz += 4) {
        const hw = getRoadWidth(rz) * 0.5 + 0.8;
        const pt = getRoadEdgePoint(rz, hw);
        if (rz === -190) ctx.moveTo(pt.x, pt.z);
        else ctx.lineTo(pt.x, pt.z);
      }
      ctx.stroke();
      // Right Berm segment 2 (z = -52 to 190)
      ctx.beginPath();
      for (let rz = -52; rz <= 190; rz += 4) {
        const hw = getRoadWidth(rz) * 0.5 + 0.8;
        const pt = getRoadEdgePoint(rz, hw);
        if (rz === -52) ctx.moveTo(pt.x, pt.z);
        else ctx.lineTo(pt.x, pt.z);
      }
      ctx.stroke();

      // 3. High-Vis Yellow Road Edge Guides
      ctx.strokeStyle = "#eab308";
      ctx.lineWidth = 0.9;
      // Left edge
      ctx.beginPath();
      for (let rz = -200; rz <= 200; rz += 4) {
        const hw = getRoadWidth(rz) * 0.5 - 0.6;
        const pt = getRoadEdgePoint(rz, -hw);
        if (rz === -200) ctx.moveTo(pt.x, pt.z);
        else ctx.lineTo(pt.x, pt.z);
      }
      ctx.stroke();
      // Right edge
      ctx.beginPath();
      for (let rz = -200; rz <= 200; rz += 4) {
        const hw = getRoadWidth(rz) * 0.5 - 0.6;
        const pt = getRoadEdgePoint(rz, hw);
        if (rz === -200) ctx.moveTo(pt.x, pt.z);
        else ctx.lineTo(pt.x, pt.z);
      }
      ctx.stroke();

      // 4. Dashed Road Centerline
      ctx.strokeStyle = "rgba(234, 179, 8, 0.4)";
      ctx.lineWidth = 0.8;
      ctx.setLineDash([3, 4]);
      ctx.beginPath();
      for (let rz = -200; rz <= 200; rz += 4) {
        const pt = getRoadEdgePoint(rz, 0);
        if (rz === -200) ctx.moveTo(pt.x, pt.z);
        else ctx.lineTo(pt.x, pt.z);
      }
      ctx.stroke();
      ctx.setLineDash([]);

      // I. Stockpiles (Iron ore mounds)
      ctx.fillStyle = "#9a3412";
      ctx.strokeStyle = "#c2410c";
      ctx.lineWidth = 0.9;
      for (const [sx, sz, sr] of STOCKPILES) {
        ctx.beginPath();
        ctx.arc(sx, sz, sr, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      for (const [sx, sz, sr] of EXTRA_STOCKPILES) {
        ctx.beginPath();
        ctx.arc(sx, sz, sr, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      // J. Heavy Mining Machinery
      // Loader at (47, -62)
      ctx.fillStyle = "#d97706";
      ctx.fillRect(45, -64, 4, 4);
      // Excavator at (-70, -30)
      ctx.fillStyle = "#ea580c";
      ctx.fillRect(-72, -32, 4.5, 4.5);

      // K. Major Boulders & Rock Obstacles
      ctx.fillStyle = "#71717a";
      for (const [rx, rz] of ROCK_SPOTS) {
        ctx.fillRect(rx - 1.2, rz - 1.2, 2.4, 2.4);
      }

      // L. Roadside Signs
      ctx.fillStyle = "#facc15";
      for (const s of ROAD_SIGNS) {
        const signU = s.x < 0 ? -10.5 : 10.5;
        const pt = getRoadEdgePoint(s.z, signU);
        ctx.fillRect(pt.x - 0.8, pt.z - 0.8, 1.6, 1.6);
      }

      // M. High-Mast Floodlight Towers
      ctx.fillStyle = "#38bdf8";
      for (const t of LIGHT_TOWERS) {
        const towerU = t.x < 0 ? -16.0 : 16.0;
        const pt = getRoadEdgePoint(t.z, towerU);
        ctx.beginPath();
        ctx.arc(pt.x, pt.z, 1.4, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore(); // Back to screen coordinates (0, 0 is top-left, cx/cy is truck)

      // 3. Screen-Space Tactical Radar Overlay
      // Concentric Range Rings (25m and 50m tactical rings)
      ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 4]);
      for (const distM of [25, 50]) {
        const rPx = distM * scale;
        ctx.beginPath();
        ctx.arc(cx, cy, rPx, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.setLineDash([]);

      // Range text indicators
      ctx.font = "bold 8px monospace";
      ctx.fillStyle = "rgba(255, 255, 255, 0.28)";
      ctx.textAlign = "center";
      ctx.fillText("25m", cx, cy - 25 * scale + 10);
      ctx.fillText("50m", cx, cy - 50 * scale + 10);

      // Forward Headlight & Sensor Perception Cone (sweeping forward from truck)
      const gradSweep = ctx.createRadialGradient(cx, cy, 2, cx, cy, 42 * scale);
      gradSweep.addColorStop(0.0, "rgba(245, 158, 11, 0.22)");
      gradSweep.addColorStop(0.4, "rgba(245, 158, 11, 0.08)");
      gradSweep.addColorStop(1.0, "rgba(245, 158, 11, 0.0)");
      ctx.fillStyle = gradSweep;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, 42 * scale, -Math.PI / 2 - 0.42, -Math.PI / 2 + 0.42);
      ctx.closePath();
      ctx.fill();

      // 4. Clean Directional HEMM Truck Marker
      // Centered at (cx, cy) and pointing straight forward (UP)
      ctx.save();
      ctx.translate(cx, cy);

      // Soft amber ground glow under vehicle
      ctx.shadowColor = "rgba(245, 158, 11, 0.75)";
      ctx.shadowBlur = 8;

      // Chassis & Tires
      ctx.fillStyle = "#18181b";
      // Dual Rear Tires
      ctx.fillRect(-6.5, 3, 2.5, 4.5);
      ctx.fillRect(4.0, 3, 2.5, 4.5);
      // Front Steerable Wheels (rotated by driver steer input)
      const steerRad = steer * 0.45;
      ctx.save();
      ctx.translate(-5.5, -4);
      ctx.rotate(steerRad);
      ctx.fillRect(-1.2, -2.5, 2.4, 5);
      ctx.restore();
      ctx.save();
      ctx.translate(5.5, -4);
      ctx.rotate(steerRad);
      ctx.fillRect(-1.2, -2.5, 2.4, 5);
      ctx.restore();

      // Truck Body / Dump Bed
      ctx.fillStyle = "#d97706";
      ctx.fillRect(-4.5, -2, 9, 8);

      // Cabin Structure
      ctx.fillStyle = "#f59e0b";
      ctx.fillRect(-3.8, -7, 7.6, 5);

      // Cabin Glass Windshield
      ctx.fillStyle = "#93c5fd";
      ctx.fillRect(-3.2, -6.5, 6.4, 1.8);

      // Bright Forward Heading Arrow / Chevron
      ctx.beginPath();
      ctx.moveTo(0, -11);
      ctx.lineTo(-4, -6);
      ctx.lineTo(0, -7.5);
      ctx.lineTo(4, -6);
      ctx.closePath();
      ctx.fillStyle = "#ffffff";
      ctx.fill();

      ctx.restore();

      // 5. Cardinal North Compass Rose Widget (Top-Right of map viewport)
      const northAngle = yaw - Math.PI / 2;
      const compX = WIDTH - 22;
      const compY = 22;
      const compR = 14;

      // Compass circular background
      ctx.beginPath();
      ctx.arc(compX, compY, compR, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(9, 9, 11, 0.75)";
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
      ctx.lineWidth = 1;
      ctx.stroke();

      // Rotating North/South Needle
      const nx = compX + Math.cos(northAngle) * (compR - 3.5);
      const ny = compY + Math.sin(northAngle) * (compR - 3.5);
      const sx = compX - Math.cos(northAngle) * (compR - 3.5);
      const sy = compY - Math.sin(northAngle) * (compR - 3.5);

      // North needle (Red)
      ctx.beginPath();
      ctx.moveTo(compX, compY);
      ctx.lineTo(nx, ny);
      ctx.strokeStyle = "#ef4444";
      ctx.lineWidth = 2.2;
      ctx.stroke();

      // South needle (Grey)
      ctx.beginPath();
      ctx.moveTo(compX, compY);
      ctx.lineTo(sx, sy);
      ctx.strokeStyle = "#71717a";
      ctx.lineWidth = 1.6;
      ctx.stroke();

      // 'N' label
      ctx.font = "bold 8px monospace";
      ctx.fillStyle = "#f87171";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("N", nx + Math.cos(northAngle) * 3, ny + Math.sin(northAngle) * 3);

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [rangeMode]);

  const x = useSim((s) => s.x);
  const z = useSim((s) => s.z);
  const yaw = useSim((s) => s.yaw);
  const speedKmh = useSim((s) => s.speedKmh);
  const headingDeg = Math.round(((-yaw * 180) / Math.PI) % 360 + 360) % 360;
  const currentElevation = getTerrainElevation(x, z);
  const zoneName = getRoadSegmentName(x, z);

  return (
    <div className="pointer-events-auto absolute bottom-4 right-4 z-20 flex flex-col overflow-hidden rounded-xl border border-amber-500/25 bg-zinc-950/90 shadow-2xl backdrop-blur-md select-none font-mono">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between border-b border-white/10 bg-zinc-900/80 px-2.5 py-1 text-[10px]">
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
          <span className="font-bold tracking-wider text-zinc-200">HAUL-NAV RTK</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setRangeMode((m) => (m === 75 ? 110 : 75))}
            className="cursor-pointer rounded bg-zinc-800/80 px-1.5 py-0.5 text-[9px] font-bold text-amber-400 hover:bg-zinc-700 transition-colors"
          >
            {rangeMode}M
          </button>
          <span className="text-zinc-500">|</span>
          <span className="font-bold text-amber-400">HDG {headingDeg.toString().padStart(3, "0")}°</span>
        </div>
      </div>

      {/* Main Map Viewport */}
      <div className="relative flex items-center justify-center bg-stone-950">
        <canvas
          ref={canvasRef}
          style={{ width: WIDTH, height: HEIGHT }}
          className="block"
        />
      </div>

      {/* Bottom Road Station & Telemetry Bar */}
      <div className="flex flex-col gap-0.5 border-t border-white/10 bg-zinc-900/90 px-2.5 py-1.5 text-[9px]">
        <div className="flex items-center justify-between">
          <span className="font-bold tracking-tight text-amber-400/90 truncate max-w-[150px]">
            {zoneName}
          </span>
          <span className="font-bold text-zinc-300">
            {speedKmh} <span className="text-zinc-500 font-normal">KM/H</span>
          </span>
        </div>
        <div className="flex items-center justify-between text-zinc-400 font-medium">
          <span>
            X: <strong className="text-zinc-200">{x.toFixed(1)}</strong> Z: <strong className="text-zinc-200">{z.toFixed(1)}</strong>
          </span>
          <span>
            ELEV: <strong className="text-amber-300">{currentElevation >= 0 ? `+${currentElevation.toFixed(1)}` : currentElevation.toFixed(1)}m</strong>
          </span>
        </div>
      </div>
    </div>
  );
}
