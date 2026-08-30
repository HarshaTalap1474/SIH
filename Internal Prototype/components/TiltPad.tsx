"use client";

import { useCallback, useRef, useState } from "react";
import { SENSOR } from "@/lib/constants";
import { useSensor } from "@/lib/virtualSensor";

const PAD_SIZE = SENSOR.padRadiusPx * 2;
const PAD_RADIUS = SENSOR.padRadiusPx;

export function TiltPad() {
  const roll = useSensor((s) => s.roll);
  const pitch = useSensor((s) => s.pitch);
  const yawHeading = useSensor((s) => s.yawHeading);
  const roadAnomaly = useSensor((s) => s.roadAnomaly);

  const dragging = useRef(false);
  const moved = useRef(false);
  const lastMove = useRef({ x: 0, y: 0 });
  const cooldownUntil = useRef(0);

  const [cursor, setCursor] = useState({ x: 0, y: 0 });

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    dragging.current = true;
    moved.current = false;
    lastMove.current = { x: e.clientX, y: e.clientY };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const dx = e.clientX - (rect.left + rect.width / 2);
    const dy = e.clientY - (rect.top + rect.height / 2);
    setCursor(clampVec(dx, dy));
    useSensor.getState().setTiltFromPad(dx, dy);

    const vel = Math.hypot(e.clientX - lastMove.current.x, e.clientY - lastMove.current.y);
    lastMove.current = { x: e.clientX, y: e.clientY };
    if (vel > 4) moved.current = true;
    if (vel > SENSOR.velocityThresholdPx && performance.now() > cooldownUntil.current) {
      useSensor.getState().triggerImpact(SENSOR.velocityImpact);
      cooldownUntil.current = performance.now() + 400;
    }
  }, []);

  const stop = useCallback(() => {
    dragging.current = false;
    setCursor({ x: 0, y: 0 });
    if (!moved.current) {
      useSensor.getState().triggerImpact(SENSOR.clickImpact);
      cooldownUntil.current = performance.now() + 400;
    }
    useSensor.getState().clearTilt();
  }, []);

  const px = (cursor.x / PAD_RADIUS) * (PAD_RADIUS - 20);
  const py = (cursor.y / PAD_RADIUS) * (PAD_RADIUS - 20);

  return (
    <div className="absolute bottom-4 right-4 z-10 flex select-none flex-col items-center gap-2">
      <div className="rounded-lg border border-white/10 bg-black/50 px-3 py-1.5 text-center text-[10px] leading-4 text-neutral-300 backdrop-blur-sm">
        <div className="font-semibold uppercase tracking-wider text-amber-400">
          Virtual Tilt Pad
        </div>
        <div className="text-neutral-400">
          MPU6050 stand-in · drag to orbit the camera · tap = pothole
        </div>
      </div>

      <div
        className="relative touch-none cursor-pointer rounded-full border border-white/20 bg-gradient-to-br from-slate-800/70 to-slate-950/80 shadow-2xl backdrop-blur-sm"
        style={{ width: PAD_SIZE, height: PAD_SIZE }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={stop}
        onPointerCancel={stop}
        onPointerLeave={stop}
      >
        <div className="absolute inset-[26px] rounded-full border border-white/10" />
        <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-white/10" />
        <div className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-white/10" />

        <div
          className="absolute left-1/2 top-1/2 rounded-full bg-amber-400 shadow-lg"
          style={{
            width: 18,
            height: 18,
            transform: `translate(calc(-50% + ${px}px), calc(-50% + ${py}px))`,
          }}
        />
      </div>

      <div className="flex gap-3 font-mono text-[11px] tabular-nums text-neutral-300">
        <span>
          ROLL <span className="text-amber-400">{Math.round(roll)}°</span>
        </span>
        <span>
          PITCH <span className="text-amber-400">{Math.round(pitch)}°</span>
        </span>
        <span>
          YAW <span className="text-amber-400">{Math.round(yawHeading)}°</span>
        </span>
      </div>

      {roadAnomaly && (
        <div className="animate-pulse rounded-md border border-orange-400/40 bg-orange-500/20 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-orange-300">
          Road anomaly detected
        </div>
      )}
    </div>
  );
}

function clampVec(x: number, y: number) {
  const len = Math.hypot(x, y);
  if (len > PAD_RADIUS) {
    const k = PAD_RADIUS / len;
    return { x: x * k, y: y * k };
  }
  return { x, y };
}