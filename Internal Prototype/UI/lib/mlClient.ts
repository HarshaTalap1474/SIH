"use client";

import { create } from "zustand";
import {
  BLOCKERS,
  PHYSICS,
} from "./constants";

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
  threatDirection: "FRONT" | "REAR" | "NONE";
  rays: {
    farLeft: number;
    left: number;
    center: number;
    right: number;
    farRight: number;
    rear: number;
    rearFarLeft: number;
    rearLeft: number;
    rearCenter: number;
    rearRight: number;
    rearFarRight: number;
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
  threatDirection: "NONE",
  rays: {
    farLeft: 80,
    left: 80,
    center: 80,
    right: 80,
    farRight: 80,
    rear: 80,
    rearFarLeft: 80,
    rearLeft: 80,
    rearCenter: 80,
    rearRight: 80,
    rearFarRight: 80,
  },
  setAdasResult: (res) => set((state) => ({ ...state, ...res })),
}));

// Semantic scene obstacle metadata
export interface SemanticObstacleMetadata {
  readonly type: "sign_board" | "crane" | "machinery" | "pole" | "rock";
  readonly name: string;
  readonly category: "big" | "small";
  readonly targetClearance: number; // 2.5m standard stop clearance
  readonly x: number;
  readonly z: number;
  readonly radius: number;
}

export const SEMANTIC_OBSTACLES: ReadonlyArray<SemanticObstacleMetadata> = [
  // Construction Crane / Heavy Excavator — Big Objects
  { type: "crane", name: "Construction Crane / Excavator", category: "big", targetClearance: 2.5, x: -70, z: -30, radius: 4.8 },
  // Construction Loader — Big Objects
  { type: "machinery", name: "Construction Loader", category: "big", targetClearance: 2.5, x: 47, z: -62, radius: 3.5 },
];

export interface RayHit {
  dist: number;
  clearance: number;
  category: "big" | "small";
}



// Map-Aware Raycast distance calculation against obstacles, barriers, and pit boundaries
function castRay(
  originX: number,
  originZ: number,
  angleRad: number,
  maxDist: number = 80
): RayHit {
  const dx = -Math.sin(angleRad);
  const dz = -Math.cos(angleRad);

  let minDist = maxDist;
  let minClearance = 2.5;
  let minCategory: "big" | "small" = "big";

  // 1. Check genuine obstacle bodies (stockpiles, boulders, machinery, poles, signs, rock clusters)
  for (let i = 0; i < BLOCKERS.length; i++) {
    const [bx, bz, br] = BLOCKERS[i];
    const clearance = 2.5;
    const isSmall = br < 2.0;
    const category: "big" | "small" = isSmall ? "small" : "big";

    const ox = bx - originX;
    const oz = bz - originZ;

    const proj = ox * dx + oz * dz;
    if (proj <= 0) continue; // Behind ray

    const perpSq = ox * ox + oz * oz - proj * proj;
    // Bumper clearance: tight collision envelope for accurate 2.5m obstacle stopping
    const effRadius = br + (br >= 3.0 ? 0.8 : 0.3);

    if (perpSq < effRadius * effRadius) {
      const hitDist = proj - Math.sqrt(Math.max(0, effRadius * effRadius - perpSq));
      if (hitDist > 0 && hitDist < minDist) {
        minDist = hitDist;
        minClearance = clearance;
        minCategory = category;
      }
    }
  }

  // 2. Pit outer mountain rim check
  const b = originX * dx + originZ * dz;
  const c = originX * originX + originZ * originZ - PHYSICS.arenaRadius * PHYSICS.arenaRadius;
  const disc = b * b - c;
  if (disc > 0) {
    const hitDist = -b + Math.sqrt(disc);
    if (hitDist > 0 && hitDist < minDist) {
      minDist = hitDist;
      minClearance = 2.5;
      minCategory = "big";
    }
  }



  return {
    dist: Math.round(minDist * 10) / 10,
    clearance: minClearance,
    category: minCategory,
  };
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
          const currentStore = useAdasStore.getState();
          // Synchronous safety lock: If vehicle is stopped at obstacle safety boundary, don't allow a stale in-flight packet to downgrade status
          const isSafetyStopped =
            currentStore.emergencyBrake &&
            currentStore.collisionRisk === "CRITICAL" &&
            (res.closest_obstacle_m || 80) <= 2.8 &&
            (res.speed_kmh || 0) <= 1.0;

          useAdasStore.getState().setAdasResult({
            connected: true,
            collisionRisk: isSafetyStopped ? "CRITICAL" : (res.collision_risk || "SAFE"),
            emergencyBrake: isSafetyStopped ? true : Boolean(res.emergency_brake),
            brakeIntensity: res.brake_intensity || 0,
            steeringGuidance: res.steering_guidance || 0,
            ttcSeconds: res.ttc_seconds || 99,
            closestObstacleM: res.closest_obstacle_m || 80,
            latencyMs: res.inference_latency_ms || 0,
            threatDirection: res.threat_direction || (Boolean(res.emergency_brake) ? "FRONT" : "NONE"),
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

    // Front sensor mount location (front bumper of the truck, 4.65m in front of center)
    const FRONT_SENSOR_OFFSET = 4.65;
    const sensorX = x + fx * FRONT_SENSOR_OFFSET;
    const sensorZ = z + fz * FRONT_SENSOR_OFFSET;

    // Rear sensor mount location (rear bumper, 4.5m behind center)
    const REAR_SENSOR_OFFSET = 4.5;
    const rearX = x - fx * REAR_SENSOR_OFFSET;
    const rearZ = z - fz * REAR_SENSOR_OFFSET;

    // Compute 5 frontal distance sensor rays + 5 rear distance sensor rays
    const rFarLeft = castRay(sensorX, sensorZ, yaw + 45 * DEG);
    const rLeft = castRay(sensorX, sensorZ, yaw + 20 * DEG);
    const rCenter = castRay(sensorX, sensorZ, yaw);
    const rRight = castRay(sensorX, sensorZ, yaw - 20 * DEG);
    const rFarRight = castRay(sensorX, sensorZ, yaw - 45 * DEG);

    const rRearFarLeft = castRay(rearX, rearZ, yaw + 135 * DEG);
    const rRearLeft = castRay(rearX, rearZ, yaw + 160 * DEG);
    const rRearCenter = castRay(rearX, rearZ, yaw + 180 * DEG);
    const rRearRight = castRay(rearX, rearZ, yaw - 160 * DEG);
    const rRearFarRight = castRay(rearX, rearZ, yaw - 135 * DEG);

    const speedKmh = Math.abs(speed) * PHYSICS.kphPerUnit;
    // Lateral offset relative to straight haul road center (x = 0)
    const lateralOffset = Math.round(x * 10) / 10;

    const rays = {
      farLeft: rFarLeft.dist,
      left: rLeft.dist,
      center: rCenter.dist,
      right: rRight.dist,
      farRight: rFarRight.dist,
      rear: rRearCenter.dist,
      rearFarLeft: rRearFarLeft.dist,
      rearLeft: rRearLeft.dist,
      rearCenter: rRearCenter.dist,
      rearRight: rRearRight.dist,
      rearFarRight: rRearFarRight.dist,
    };

    useAdasStore.getState().setAdasResult({ rays });

    const isRev = isReversing || speed < -0.05;
    const activeRays = isRev
      ? [rRearCenter, rRearLeft, rRearRight, rRearFarLeft, rRearFarRight]
      : [rCenter, rLeft, rRight, rFarLeft, rFarRight];

    const activeThreat = activeRays.reduce((min, r) => (r.dist < min.dist ? r : min));
    const [c, l, r] = activeRays;
    const activeThreatDist = Math.min(c.dist, l.dist < 15 ? l.dist * 1.5 : 99, r.dist < 15 ? r.dist * 1.5 : 99);
    const rearThreatDist = Math.min(rRearCenter.dist, rRearLeft.dist < 15 ? rRearLeft.dist * 1.5 : 99, rRearRight.dist < 15 ? rRearRight.dist * 1.5 : 99);
    const targetClearance = 2.5; // 2.5m target stop clearance

    const speedMs = speedKmh / 3.6;
    // Physical emergency stopping distance required to prevent collision (a = 8.0 m/s²)
    const dReqStop = speedMs * 0.25 + (speedMs * speedMs) / (2.0 * 8.0) + 0.5;
    // Critical trigger: stopped at obstacle safety clearance OR imminent 2.5-meter stop threshold OR critical emergency threat
    const isStoppedAtSafety = activeThreatDist <= (targetClearance + 0.25) && speedMs <= 0.3;
    const isCritical = isStoppedAtSafety || activeThreatDist <= (targetClearance + 0.05) || (activeThreatDist <= dReqStop && speedMs > 2.0);
    const isCaution = activeThreatDist <= (dReqStop * 1.4 + 4.0) && activeThreatDist < 18.0 && !isCritical;
    const activeTtc = speedMs > 0.4 ? Math.round((activeThreatDist / speedMs) * 10) / 10 : 99;

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const payload = {
        ray_far_left: rFarLeft.dist,
        ray_left: rLeft.dist,
        ray_center: rCenter.dist,
        ray_right: rRight.dist,
        ray_far_right: rFarRight.dist,
        ray_rear: Math.round(rearThreatDist * 10) / 10,
        speed_kmh: Math.round(speedKmh * 10) / 10,
        steer_angle: Math.round(steer * 100) / 100,
        lateral_offset: lateralOffset,
        is_reversing: isRev,
        target_clearance: targetClearance,
        obstacle_category: activeThreat.category,
      };
      this.ws.send(JSON.stringify(payload));
    } else {
      // Offline safety fallback: full front + rear obstacle detection and AEB trigger
      useAdasStore.getState().setAdasResult({
        connected: isCritical || isCaution,
        collisionRisk: isCritical ? "CRITICAL" : (isCaution ? "CAUTION" : "SAFE"),
        emergencyBrake: isCritical,
        threatDirection: isCritical || isCaution ? (isRev ? "REAR" : "FRONT") : "NONE",
        closestObstacleM: Math.round(activeThreatDist * 10) / 10,
        ttcSeconds: activeTtc,
      });
    }
  }
}

export const adasClient = new ADASWebSocketClient();
