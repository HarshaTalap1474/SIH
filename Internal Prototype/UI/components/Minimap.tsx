"use client";

import { useEffect, useRef } from "react";
import { useSim } from "@/lib/simStore";
import { STOCKPILES, ROCK_SPOTS, PHYSICS, getRoadEdgePoint } from "@/lib/constants";

const SIZE = 160;
const RADIUS = SIZE / 2;
const MAP_RANGE_M = 70; // 70-meter radar radius
const SCALE = RADIUS / MAP_RANGE_M; // px per meter

const EXTRA_STOCKPILES = [
  [55, -67, 6],
  [48, -56, 5],
] as const;

export function Minimap() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = SIZE * dpr;
    canvas.height = SIZE * dpr;
    ctx.scale(dpr, dpr);

    let animId: number;

    const render = () => {
      const { x: truckX, z: truckZ, yaw } = useSim.getState();
      const cx = RADIUS;
      const cy = RADIUS;

      ctx.clearRect(0, 0, SIZE, SIZE);

      // Circular clip mask for minimap
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, RADIUS - 2, 0, Math.PI * 2);
      ctx.clip();

      // Background terrain color
      ctx.fillStyle = "#1c1917";
      ctx.fillRect(0, 0, SIZE, SIZE);

      // Rotate & translate world map so vehicle is centered and forward is UP
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(yaw);
      ctx.scale(SCALE, SCALE);
      ctx.translate(-truckX, -truckZ);

      // 1. Outer Pit Perimeter (120m radius)
      ctx.beginPath();
      ctx.arc(0, 0, PHYSICS.arenaRadius, 0, Math.PI * 2);
      ctx.strokeStyle = "#573422";
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // 2. Main 18m-wide Haul Road (synchronized with curved 3D road path)
      ctx.beginPath();
      for (let rz = -190; rz <= 190; rz += 5) {
        const pt = getRoadEdgePoint(rz, -9.0);
        if (rz === -190) ctx.moveTo(pt.x, pt.z);
        else ctx.lineTo(pt.x, pt.z);
      }
      for (let rz = 190; rz >= -190; rz -= 5) {
        const pt = getRoadEdgePoint(rz, 9.0);
        ctx.lineTo(pt.x, pt.z);
      }
      ctx.closePath();
      ctx.fillStyle = "#292524";
      ctx.fill();

      // Yellow road edge lines
      ctx.strokeStyle = "#e5a100";
      ctx.lineWidth = 0.8;
      // Left edge line
      ctx.beginPath();
      for (let rz = -190; rz <= 190; rz += 5) {
        const pt = getRoadEdgePoint(rz, -8.4);
        if (rz === -190) ctx.moveTo(pt.x, pt.z);
        else ctx.lineTo(pt.x, pt.z);
      }
      ctx.stroke();
      // Right edge line
      ctx.beginPath();
      for (let rz = -190; rz <= 190; rz += 5) {
        const pt = getRoadEdgePoint(rz, 8.4);
        if (rz === -190) ctx.moveTo(pt.x, pt.z);
        else ctx.lineTo(pt.x, pt.z);
      }
      ctx.stroke();

      // 3. Silt Pond / Drainage Sump at (-55, 35), radius 11
      ctx.beginPath();
      ctx.arc(-55, 35, 11, 0, Math.PI * 2);
      ctx.fillStyle = "#134e4a";
      ctx.fill();
      ctx.strokeStyle = "#14b8a6";
      ctx.lineWidth = 1;
      ctx.stroke();

      // 4. Primary Crusher Platform at (52, -62), radius 13 + Ramp
      ctx.beginPath();
      ctx.arc(52, -62, 13, 0, Math.PI * 2);
      ctx.fillStyle = "#453224";
      ctx.fill();
      ctx.strokeStyle = "#78350f";
      ctx.lineWidth = 1;
      ctx.stroke();

      // Crusher loading ramp
      ctx.fillStyle = "#332c27";
      ctx.fillRect(28, -66.5, 16, 9);

      // 5. Stockpiles (ore mounds)
      ctx.fillStyle = "#92400e";
      ctx.strokeStyle = "#b45309";
      ctx.lineWidth = 1;
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

      // 6. Heavy Machinery (Loader & Excavator)
      ctx.fillStyle = "#d97706";
      ctx.fillRect(45, -64, 4, 4); // Loader
      ctx.fillStyle = "#ea580c";
      ctx.fillRect(-72, -32, 4, 4); // Excavator

      // 7. Boulders (Rock spots)
      ctx.fillStyle = "#71717a";
      for (const [rx, rz] of ROCK_SPOTS) {
        ctx.fillRect(rx - 1, rz - 1, 2, 2);
      }

      ctx.restore(); // Back to screen coordinates

      // Concentric Radar Range Rings (25m & 50m tactical proximity rings)
      ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 4]);
      for (const distM of [25, 50]) {
        const rPx = distM * SCALE;
        ctx.beginPath();
        ctx.arc(cx, cy, rPx, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.setLineDash([]);

      // Forward Headlight & Sensor Perception Cone (Subtle amber radar sweep)
      const gradSweep = ctx.createRadialGradient(cx, cy, 2, cx, cy, 48 * SCALE);
      gradSweep.addColorStop(0, "rgba(245, 158, 11, 0.16)");
      gradSweep.addColorStop(0.45, "rgba(245, 158, 11, 0.06)");
      gradSweep.addColorStop(1, "rgba(245, 158, 11, 0.0)");
      ctx.fillStyle = gradSweep;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, 48 * SCALE, -Math.PI / 2 - 0.42, -Math.PI / 2 + 0.42);
      ctx.closePath();
      ctx.fill();

      // Vehicle Marker (Center chevron with glowing drop shadow pointing straight UP)
      ctx.save();
      ctx.shadowColor = "rgba(245, 158, 11, 0.6)";
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.moveTo(cx, cy - 9);
      ctx.lineTo(cx - 5.5, cy + 5.5);
      ctx.lineTo(cx, cy + 2.5);
      ctx.lineTo(cx + 5.5, cy + 5.5);
      ctx.closePath();
      ctx.fillStyle = "#f59e0b";
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.4;
      ctx.stroke();
      ctx.restore();

      ctx.restore(); // Release clip mask

      // Outer Bezel Rim with Technical Ticks
      ctx.beginPath();
      ctx.arc(cx, cy, RADIUS - 2, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(245, 158, 11, 0.45)";
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Cardinal North marker ('N') pointing to true North (-Z direction)
      const northAngle = yaw - Math.PI / 2;
      const nx = cx + Math.cos(northAngle) * (RADIUS - 9);
      const ny = cy + Math.sin(northAngle) * (RADIUS - 9);
      ctx.font = "bold 10px monospace";
      ctx.fillStyle = "#ef4444";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("N", nx, ny);

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, []);

  const x = useSim((s) => s.x);
  const z = useSim((s) => s.z);
  const yaw = useSim((s) => s.yaw);
  const headingDeg = Math.round(((-yaw * 180) / Math.PI) % 360 + 360) % 360;

  return (
    <div className="pointer-events-none absolute bottom-5 right-5 z-20 flex flex-col items-center gap-1.5 select-none">
      <div className="relative flex items-center justify-center rounded-full bg-zinc-950/90 shadow-2xl backdrop-blur-md">
        <canvas
          ref={canvasRef}
          style={{ width: SIZE, height: SIZE }}
          className="rounded-full"
        />
      </div>

      <div className="flex items-center gap-2 rounded-full border border-white/10 bg-zinc-950/80 px-2.5 py-0.5 font-mono text-[9px] font-bold text-zinc-400 shadow-md backdrop-blur-md">
        <span className="text-amber-400">HDG {headingDeg.toString().padStart(3, "0")}°</span>
        <span className="text-zinc-600">|</span>
        <span>X:{Math.round(x)} Z:{Math.round(z)}</span>
      </div>
    </div>
  );
}
