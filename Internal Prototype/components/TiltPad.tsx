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

  const dragging = useRef(false);
  const moved = useRef(false);
  const lastMove = useRef({ x: 0, y: 0 });
  const cooldownUntil = useRef(0);

  const [cursor, setCursor] = useState({ x: 0, y: 0 });
  const [collapsed, setCollapsed] = useState(true);

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
    <div className="fixed bottom-24 right-4 z-30 flex select-none flex-col items-end gap-2">
      {/* Toggle button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-neutral-950/80 px-2.5 py-1 text-[11px] font-semibold text-neutral-300 shadow-xl backdrop-blur-md transition-all hover:bg-neutral-800"
      >
        <span>🕹</span>
        <span>{collapsed ? "Open Tilt Pad" : "Hide Tilt Pad"}</span>
      </button>

      {!collapsed && (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-white/10 bg-neutral-950/90 p-3 shadow-2xl backdrop-blur-md">
          <div className="text-center text-[10px] leading-tight text-neutral-400">
            <span className="font-semibold text-amber-400">Virtual MPU-6050 Pad</span>
            <br />
            Drag to orbit · Tap = pothole jolt
          </div>

          <div
            className="relative touch-none cursor-pointer rounded-full border border-amber-500/30 bg-gradient-to-br from-neutral-900 to-neutral-950 shadow-inner shadow-black"
            style={{ width: PAD_SIZE, height: PAD_SIZE }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={stop}
            onPointerCancel={stop}
            onPointerLeave={stop}
          >
            <div className="absolute inset-[26px] rounded-full border border-white/5" />
            <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-white/10" />
            <div className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-white/10" />

            <div
              className="absolute left-1/2 top-1/2 rounded-full bg-amber-400 shadow-md shadow-amber-400/50"
              style={{
                width: 18,
                height: 18,
                transform: `translate(calc(-50% + ${px}px), calc(-50% + ${py}px))`,
              }}
            />
          </div>

          <div className="flex gap-2 font-mono text-[10px] tabular-nums text-neutral-300">
            <span>R: <strong className="text-amber-400">{Math.round(roll)}°</strong></span>
            <span>P: <strong className="text-amber-400">{Math.round(pitch)}°</strong></span>
            <span>Y: <strong className="text-amber-400">{Math.round(yawHeading)}°</strong></span>
          </div>
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