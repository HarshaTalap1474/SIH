"use client";

import { create } from "zustand";
import { BLOCKERS, PHYSICS } from "./constants";

export type CollisionRisk = "SAFE" | "CAUTION" | "CRITICAL";

export interface AdasState {
  connected: boolean;
  collisionRisk: CollisionRisk;
  emergencyBrake: boolean;
  brakeIntensity: number;
  steeringGuidance: number; // -1.0 (steer left) to +1.0 (steer right)
  ttcSeconds: number;
  closestObstacleM: number;
  latencyMs: number;
  rays: {
    farLeft: number;
    left: number;
    center: number;
    right: number;
    farRight: number;
    rear: number;
  };
  setAdasResult: (res: Partial<AdasState>) => void;
}

export const useAdasStore = create<AdasState>()((set) => ({
  connected: false,
  collisionRisk: "SAFE",
  emergencyBrake: false,
  brakeIntensity: 0,
  steeringGuidance: 0,
  ttcSeconds: 99,
  closestObstacleM: 80,
  latencyMs: 0,
  rays: {
    farLeft: 80,
    left: 80,
    center: 80,
    right: 80,
    farRight: 80,
    rear: 80,
  },
  setAdasResult: (res) => set((state) => ({ ...state, ...res })),
}));

// Map-Aware Raycast distance calculation against obstacles and pit boundaries
function castRay(
  originX: number,
  originZ: number,
  angleRad: number,
  maxDist: number = 80
): number {
  const dx = -Math.sin(angleRad);
  const dz = -Math.cos(angleRad);

  let minDist = maxDist;

  // 1. Check genuine obstacle bodies (stockpiles, boulders, machinery)
  for (const [bx, bz, br] of BLOCKERS) {
    const ox = bx - originX;
    const oz = bz - originZ;

    const proj = ox * dx + oz * dz;
    if (proj <= 0) continue; // Behind ray

    const perpSq = ox * ox + oz * oz - proj * proj;
    const effRadius = br + 1.2;

    if (perpSq < effRadius * effRadius) {
      const hitDist = proj - Math.sqrt(Math.max(0, effRadius * effRadius - perpSq));
      if (hitDist > 0 && hitDist < minDist) {
        minDist = hitDist;
      }
    }
  }

  // 2. Road Berm boundary check
  // Straight road left/right berms at x = -9.6 and +9.6
  // Check intersection only if ray points towards the side berms
  const ROAD_HALF_WIDTH = 9.4;
  if (Math.abs(originX) <= ROAD_HALF_WIDTH + 1.5) {
    // If ray points towards left berm (dx < -0.15)
    if (dx < -0.15) {
      const distToLeft = (-ROAD_HALF_WIDTH - originX) / dx;
      if (distToLeft > 0 && distToLeft < minDist) {
        minDist = distToLeft;
      }
    }
    // If ray points towards right berm (dx > 0.15)
    else if (dx > 0.15) {
      const distToRight = (ROAD_HALF_WIDTH - originX) / dx;
      if (distToRight > 0 && distToRight < minDist) {
        minDist = distToRight;
      }
    }
  }

  // 3. Pit outer mountain rim check (exact ray-circle boundary intersection)
  const b = originX * dx + originZ * dz;
  const c = originX * originX + originZ * originZ - PHYSICS.arenaRadius * PHYSICS.arenaRadius;
  const disc = b * b - c;
  if (disc > 0) {
    const hitDist = -b + Math.sqrt(disc);
    if (hitDist > 0 && hitDist < minDist) {
      minDist = hitDist;
    }
  }

  return Math.round(minDist * 10) / 10;
}

class ADASWebSocketClient {
  private ws: WebSocket | null = null;
  private isConnecting = false;
  private lastSendTime = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;

  public init() {
    if (typeof window === "undefined") return;
    this.connect();
  }

  private connect() {
    if (this.ws || this.isConnecting) return;
    this.isConnecting = true;

    try {
      this.ws = new WebSocket("ws://localhost:8765/ws/telemetry");

      this.ws.onopen = () => {
        this.isConnecting = false;
        useAdasStore.getState().setAdasResult({ connected: true });
        console.log("[ADAS] Connected to Python TinyML Inference Server (ws://localhost:8765)");
      };

      this.ws.onmessage = (event) => {
        try {
          const res = JSON.parse(event.data);
          useAdasStore.getState().setAdasResult({
            collisionRisk: res.collision_risk || "SAFE",
            emergencyBrake: !!res.emergency_brake,
            brakeIntensity: res.brake_intensity || 0,
            steeringGuidance: res.steering_guidance || 0,
            ttcSeconds: res.ttc_seconds || 99,
            closestObstacleM: res.closest_obstacle_m || 80,
            latencyMs: res.inference_latency_ms || 0,
          });
        } catch {
          // ignore parse error
        }
      };

      this.ws.onclose = () => {
        this.ws = null;
        this.isConnecting = false;
        useAdasStore.getState().setAdasResult({ connected: false });
        this.scheduleReconnect();
      };

      this.ws.onerror = () => {
        if (this.ws) this.ws.close();
      };
    } catch {
      this.isConnecting = false;
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, 2500);
  }

  public update(x: number, z: number, yaw: number, speed: number, steer: number) {
    const now = performance.now();
    // Throttle to 30 Hz for optimal network efficiency
    if (now - this.lastSendTime < 33) return;
    this.lastSendTime = now;

    // Compute 5 frontal distance sensor rays + 1 rear ray (yaw + angle is Left, yaw - angle is Right)
    const DEG = Math.PI / 180;
    const rFarLeft = castRay(x, z, yaw + 45 * DEG);
    const rLeft = castRay(x, z, yaw + 20 * DEG);
    const rCenter = castRay(x, z, yaw);
    const rRight = castRay(x, z, yaw - 20 * DEG);
    const rFarRight = castRay(x, z, yaw - 45 * DEG);
    const rRear = castRay(x, z, yaw + 180 * DEG);

    const speedKmh = Math.abs(speed) * PHYSICS.kphPerUnit;
    // Lateral offset relative to straight haul road center (x = 0)
    const lateralOffset = Math.round(x * 10) / 10;

    const rays = {
      farLeft: rFarLeft,
      left: rLeft,
      center: rCenter,
      right: rRight,
      farRight: rFarRight,
      rear: rRear,
    };

    useAdasStore.getState().setAdasResult({ rays });

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      // Send telemetry to Python TinyML server
      const payload = {
        ray_far_left: rFarLeft,
        ray_left: rLeft,
        ray_center: rCenter,
        ray_right: rRight,
        ray_far_right: rFarRight,
        ray_rear: rRear,
        speed_kmh: Math.round(speedKmh * 10) / 10,
        steer_angle: Math.round(steer * 100) / 100,
        lateral_offset: lateralOffset,
      };
      this.ws.send(JSON.stringify(payload));
    } else {
      // Local fallback calculation aligned with map geometry
      const minFwd = Math.min(rCenter, Math.min(rLeft, rRight) * 1.05);
      const speedMs = speedKmh / 3.6;
      const dSafe = speedMs * 0.25 + (speedMs * speedMs) / (2 * 3.2) + 2.5;
      const ttc = speedMs > 0.5 ? Math.round((minFwd / speedMs) * 10) / 10 : 99;
      const isImminent = minFwd < 5.0;

      let risk: CollisionRisk = "SAFE";
      let eBrake = false;
      if (minFwd <= dSafe || isImminent || (minFwd < 6.5 && speedKmh > 2.0)) {
        risk = "CRITICAL";
        eBrake = true;
      } else if (minFwd <= (dSafe * 2.0 + 8.0) && minFwd < 40.0) {
        risk = "CAUTION";
      }

      const steerDiff = (rRight - rLeft) / Math.max(rRight + rLeft, 1);
      const steerGuide = Math.max(-1, Math.min(1, steerDiff * 1.8));

      useAdasStore.getState().setAdasResult({
        collisionRisk: risk,
        emergencyBrake: eBrake,
        brakeIntensity: eBrake ? 1.0 : (risk === "CAUTION" ? 0.35 : 0),
        steeringGuidance: Math.round(steerGuide * 100) / 100,
        ttcSeconds: ttc,
        closestObstacleM: minFwd,
      });
    }
  }
}

export const adasClient = new ADASWebSocketClient();
