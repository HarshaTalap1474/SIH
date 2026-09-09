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

// Semantic non-collidable scene obstacles (detected by ADAS perception sensors, no physics colliders)
export interface SemanticObstacleMetadata {
  readonly type: "sign_board" | "crane" | "machinery";
  readonly name: string;
  readonly x: number;
  readonly z: number;
  readonly radius: number;
}

export const SEMANTIC_OBSTACLES: ReadonlyArray<SemanticObstacleMetadata> = [
  // Roadside Sign Boards (from Terrain.tsx MineSign)
  { type: "sign_board", name: "SPEED 20 Sign", x: -11, z: -40, radius: 1.4 },
  { type: "sign_board", name: "CAUTION FOG Sign", x: 11, z: -100, radius: 1.4 },
  { type: "sign_board", name: "HAUL ROAD Sign", x: -11, z: -160, radius: 1.4 },
  // Construction Crane / Heavy Excavator (from Terrain.tsx Excavator)
  { type: "crane", name: "Construction Crane / Excavator", x: -70, z: -30, radius: 4.8 },
  // Construction Loader (from Terrain.tsx Loader)
  { type: "machinery", name: "Construction Loader", x: 47, z: -62, radius: 3.2 },
];

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

  // 2. Check semantic non-collidable scene objects (roadside sign boards, construction cranes)
  for (const obj of SEMANTIC_OBSTACLES) {
    const ox = obj.x - originX;
    const oz = obj.z - originZ;

    const proj = ox * dx + oz * dz;
    if (proj <= 0) continue; // Behind ray

    const perpSq = ox * ox + oz * oz - proj * proj;
    const effRadius = obj.radius + 1.2;

    if (perpSq < effRadius * effRadius) {
      const hitDist = proj - Math.sqrt(Math.max(0, effRadius * effRadius - perpSq));
      if (hitDist > 0 && hitDist < minDist) {
        minDist = hitDist;
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
      const host =
        typeof window !== "undefined" && window.location.hostname && window.location.hostname !== "localhost"
          ? window.location.hostname
          : "127.0.0.1";
      this.ws = new WebSocket(`ws://${host}:8765/ws/telemetry`);

      this.ws.onopen = () => {
        this.isConnecting = false;
        useAdasStore.getState().setAdasResult({ connected: true });
        console.log(`[ADAS] Connected to Python TinyML Inference Server (ws://${host}:8765)`);
      };

      this.ws.onmessage = (event) => {
        try {
          const res = JSON.parse(event.data);
          useAdasStore.getState().setAdasResult({
            connected: true,
            collisionRisk: res.collision_risk || "SAFE",
            emergencyBrake: Boolean(res.emergency_brake),
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
        useAdasStore.getState().setAdasResult({
          connected: false,
          collisionRisk: "SAFE",
          emergencyBrake: false,
          brakeIntensity: 0,
          steeringGuidance: 0,
          ttcSeconds: 99,
          closestObstacleM: 80,
          latencyMs: 0,
        });
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

  public update(
    x: number,
    z: number,
    yaw: number,
    speed: number,
    steer: number,
    isReversing: boolean = false
  ) {
    const now = performance.now();
    // Throttle to 30 Hz for optimal network efficiency
    if (now - this.lastSendTime < 33) return;
    this.lastSendTime = now;

    const DEG = Math.PI / 180;
    const fx = -Math.sin(yaw);
    const fz = -Math.cos(yaw);

    // Front sensor mount location (front bumper of the truck, 3.1m in front of center)
    const sensorX = x + fx * 3.1;
    const sensorZ = z + fz * 3.1;

    // Rear sensor mount location (rear bumper, 3.1m behind center)
    const rearX = x - fx * 3.1;
    const rearZ = z - fz * 3.1;

    // Compute 5 frontal distance sensor rays + 1 rear ray
    const rFarLeft = castRay(sensorX, sensorZ, yaw + 45 * DEG);
    const rLeft = castRay(sensorX, sensorZ, yaw + 20 * DEG);
    const rCenter = castRay(sensorX, sensorZ, yaw);
    const rRight = castRay(sensorX, sensorZ, yaw - 20 * DEG);
    const rFarRight = castRay(sensorX, sensorZ, yaw - 45 * DEG);
    const rRear = castRay(rearX, rearZ, yaw + 180 * DEG);

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

    const isRev = isReversing || speed < -0.05;

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
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
        is_reversing: isRev,
      };
      this.ws.send(JSON.stringify(payload));
    } else {
      // Offline safety fallback: ensure obstacle detection and AEB trigger even when offline
      const fwdThreat = Math.min(rCenter, rLeft < 15 ? rLeft * 1.5 : 99, rRight < 15 ? rRight * 1.5 : 99);
      const speedMs = speedKmh / 3.6;
      const dReqStop = speedMs * 0.25 + (speedMs * speedMs) / (2.0 * 3.2) + 3.0;
      const isCritical = (fwdThreat <= dReqStop && speedMs > 0.5) || fwdThreat < 4.8;
      const isCaution = fwdThreat <= (dReqStop * 1.7 + 6.0) && fwdThreat < 45.0;
      const effectiveEBrake = isCritical && !isRev;

      useAdasStore.getState().setAdasResult({
        connected: effectiveEBrake || isCaution,
        collisionRisk: isCritical ? "CRITICAL" : (isCaution ? "CAUTION" : "SAFE"),
        emergencyBrake: effectiveEBrake,
        closestObstacleM: Math.round(fwdThreat * 10) / 10,
        ttcSeconds: speedMs > 0.5 ? Math.round((fwdThreat / speedMs) * 10) / 10 : 99,
      });
    }
  }
}

export const adasClient = new ADASWebSocketClient();
