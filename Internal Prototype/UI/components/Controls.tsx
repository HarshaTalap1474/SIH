"use client";

import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  BLOCKERS,
  DUMPER,
  PHYSICS,
  clamp,
  damp,
  getRoadElevation,
  getRoadLateralOffset,
  getRoadWidth,
  getTerrainElevation,
} from "@/lib/constants";
import { isKeyDown } from "@/lib/keys";
import { useSensor } from "@/lib/virtualSensor";
import { useSim, GearMode } from "@/lib/simStore";
import { rigParts } from "@/lib/rig";
import { adasClient, useAdasStore } from "@/lib/mlClient";
import { hwClient, useHardwareStore } from "@/lib/hardwareClient";

/**
 * Analytical 3D mountain and solid barrier collision tester.
 * Evaluates whether world coordinate (px, pz) represents impassable mountain geometry.
 */
function isMountainTerrain(px: number, pz: number, truckY: number | null): boolean {
  // 1. Engineered haul road & immediate shoulder exemption: road is always drivable
  const { u, center } = getRoadLateralOffset(px, pz);
  const halfW = getRoadWidth(pz) * 0.5;
  const absU = Math.abs(u);
  if (absU <= halfW + 1.2) {
    return false;
  }

  // 2. Arena perimeter mountain ridge boundary (beyond 185m)
  if (Math.hypot(px, pz) > 185) {
    return true;
  }

  // 3. Central rocky mountain spur at (26, 8)
  if (Math.hypot(px - 26, pz - 8) < 15) return true;

  // 4. Terrain elevation & highwall sampling
  const py = getTerrainElevation(px, pz);
  const heightAboveRoad = py - center.y;

  // Highwall rock faces & mountain massifs rising above road/bench level
  if (heightAboveRoad > 3.2) {
    return true;
  }

  // Slope and step height calculation
  const delta = 0.5;
  const sx = (getTerrainElevation(px + delta, pz) - getTerrainElevation(px - delta, pz)) / (2 * delta);
  const sz = (getTerrainElevation(px, pz + delta) - getTerrainElevation(px, pz - delta)) / (2 * delta);
  const slope = Math.hypot(sx, sz);

  // Impassable steep cliff / highwall rock face
  if (truckY !== null) {
    const hAboveTruck = py - truckY;
    if (hAboveTruck > 1.35) {
      return true; // Attempting to climb a steep mountain wall
    }
    if (slope > 0.40 && hAboveTruck > 0.35) {
      return true; // Steep uphill rock face
    }
  } else {
    if (slope > 0.42 && heightAboveRoad > 0.8) {
      return true;
    }
  }

  return false;
}

/**
 * Multi-point vehicle footprint collision check against 3D mountain geometry.
 * Tests front bumper, rear bumper, left and right sides of the HEMM.
 */
function checkTruckTerrainCollision(tx: number, tz: number, tyaw: number): {
  collided: boolean;
  hitX: number;
  hitZ: number;
} {
  const truckY = getTerrainElevation(tx, tz);
  const fx = -Math.sin(tyaw);
  const fz = -Math.cos(tyaw);
  const rx = Math.cos(tyaw);
  const rz = -Math.sin(tyaw);

  // 9 probe points covering the HEMM boundary: center, front-center, front-L, front-R, mid-L, mid-R, rear-center, rear-L, rear-R
  const probes: Array<[number, number]> = [
    [0, 0],
    [fx * 4.0, fz * 4.0],
    [fx * 4.0 - rx * 2.3, fz * 4.0 - rz * 2.3],
    [fx * 4.0 + rx * 2.3, fz * 4.0 + rz * 2.3],
    [-rx * 2.3, -rz * 2.3],
    [rx * 2.3, rz * 2.3],
    [-fx * 3.6, -fz * 3.6],
    [-fx * 3.6 - rx * 2.3, -fz * 3.6 - rz * 2.3],
    [-fx * 3.6 + rx * 2.3, -fz * 3.6 + rz * 2.3],
  ];

  for (let i = 0; i < probes.length; i++) {
    const px = tx + probes[i][0];
    const pz = tz + probes[i][1];
    if (isMountainTerrain(px, pz, truckY)) {
      return { collided: true, hitX: px, hitZ: pz };
    }
  }
  return { collided: false, hitX: 0, hitZ: 0 };
}

export function Controls() {
  const prevSpeed = useRef(0);
  const pitchVis = useRef(0);
  const pitchVel = useRef(0);
  const rollVis = useRef(0);
  const rollVel = useRef(0);
  const steerVis = useRef(0);
  const spinAngle = useRef(0);
  const joltVis = useRef(0);
  const estopLatched = useRef(false); // physical E-Stop — clears on button release, disconnect, or X key
  const prevEstop = useRef(false);
  const prevXKey = useRef(false);
  const smoothSlope = useRef(0);

  useEffect(() => {
    adasClient.init();
    hwClient.init();
  }, []);

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    useSensor.getState().tick(dt);

    const sim = useSim.getState();
    let { x, z, yaw, speed, steer, boost } = sim;

    const hw = useHardwareStore.getState();
    const connected = hw.connected;

    // Hardware buttons — boost = BOTH throttle AND brake held simultaneously
    const hwThrottle = hw.buttons.throttle ? 1 : 0;
    const hwBrakeOnly = hw.buttons.brake && !hw.buttons.throttle ? -1 : 0;
    const hwLeft = hw.buttons.left ? 1 : 0;
    const hwRight = hw.buttons.right ? 1 : 0;

    // Keyboard (existing)
    const w = isKeyDown("KeyW");
    const s = isKeyDown("KeyS");
    const a = isKeyDown("KeyA");
    const d = isKeyDown("KeyD");

    let keyThrottle = 0;
    boost = false;
    if (connected) {
      if (hw.buttons.throttle && hw.buttons.brake) {
        boost = true;
        keyThrottle = 1; // boost: both held
      } else {
        keyThrottle = hwThrottle + hwBrakeOnly;
      }
    } else {
      if (w && s) {
        boost = true;
        keyThrottle = 1;
      } else if (w) keyThrottle = 1;
      else if (s) keyThrottle = -1;
    }

    // Combined steer
    steer = connected
      ? clamp((hwLeft ? 1 : 0) - (hwRight ? 1 : 0), -1, 1)
      : clamp((a ? 1 : 0) - (d ? 1 : 0), -1, 1);

    // Active Reversing condition (driver commanding reverse or actively moving backward)
    const isReversing = keyThrottle < 0 || (speed < -0.05 && keyThrottle <= 0);

    // E-Stop: physical hardware button / X key latch
    if (connected && hw.buttons.estop && !prevEstop.current) {
      estopLatched.current = true;
    }
    const xKey = isKeyDown("KeyX");
    if (xKey && !prevXKey.current) {
      estopLatched.current = false;
    }
    prevXKey.current = xKey;
    if (!connected || (prevEstop.current && !hw.buttons.estop)) {
      estopLatched.current = false;
    }
    prevEstop.current = connected ? hw.buttons.estop : false;
    useHardwareStore.getState().setEstopActive(estopLatched.current);

    // ADAS TinyML Perception & Telemetry update (telemetry streamed to Python inference server)
    adasClient.update(x, z, yaw, speed, steer, isReversing);
    const adas = useAdasStore.getState();

    // Autonomous Emergency Brake (strictly commanded by connected TinyML ML model) & Hardware E-Stop Interlock
    const isEStopped = estopLatched.current;
    const isAebActive = adas.connected && adas.emergencyBrake;
    const isAebForward = isAebActive && (adas.threatDirection === "FRONT" || !isReversing);
    const isAebRear = isAebActive && (adas.threatDirection === "REAR" || isReversing);

    const isBlockedAhead = isEStopped || isAebForward;
    const isBlockedBehind = isEStopped || isAebRear;

    let throttle = keyThrottle;
    if (isBlockedAhead && throttle > 0) throttle = 0;
    if (isBlockedBehind && throttle < 0) throttle = 0;

    // Realistic slope detection along the vehicle's direction of travel
    const fwdX = -Math.sin(yaw);
    const fwdZ = -Math.cos(yaw);
    const travelDir = isReversing ? -1 : 1;
    const travelX = travelDir * fwdX;
    const travelZ = travelDir * fwdZ;
    const sampleDist = 2.0;
    const roadYCurrent = getTerrainElevation(x, z);
    const roadYAhead = getTerrainElevation(x + travelX * sampleDist, z + travelZ * sampleDist);
    const rawSlope = (roadYAhead - roadYCurrent) / sampleDist; // positive = climbing uphill

    // Uphill resistance applies strictly when travelling uphill (slope > 0)
    // Downhill travel (rawSlope <= 0) experiences zero uphill resistance
    const uphillSlope = rawSlope > 0.012 ? rawSlope : 0;
    smoothSlope.current = damp(smoothSlope.current, uphillSlope, 3.2, dt);

    // Proportional uphill resistance factor:
    // Gentle slope (~0.04): factor ~0.90 -> 39 km/h drops to ~35 km/h
    // Moderate slope (~0.08): factor ~0.80 -> 39 km/h drops to ~31 km/h
    // Steeper slope (~0.12): factor ~0.68 -> 39 km/h drops to ~26 km/h
    const slopeMultiplier = boost ? 2.0 : 2.6;
    const minFactor = boost ? 0.65 : 0.58;
    const uphillFactor = clamp(1.0 - smoothSlope.current * slopeMultiplier, minFactor, 1.0);

    const maxSpeed = boost
      ? PHYSICS.boostMaxSpeed
      : throttle >= 0
        ? PHYSICS.normalMaxSpeed
        : PHYSICS.reverseMaxSpeed;

    const target = throttle * maxSpeed * (throttle !== 0 ? uphillFactor : 1.0);

    // Speed tracking: emergency brake deceleration when blocked, otherwise responsive drive physics
    if (isBlockedAhead && speed > 0) {
      speed = Math.max(0, speed - PHYSICS.brake * 3.5 * dt);
      if (speed <= 0.05) speed = 0;
    } else if (isBlockedBehind && speed < 0) {
      speed = Math.min(0, speed + PHYSICS.brake * 3.5 * dt);
      if (speed >= -0.05) speed = 0;
    } else if (Math.abs(throttle) > PHYSICS.throttleDeadzone) {
      if (throttle > 0) {
        if (target > speed) {
          // Accelerating: gravity drag slightly reduces acceleration on hills
          const gravityDrag = smoothSlope.current * 9.81 * 0.25;
          const effectiveAccel = Math.max(0.65, PHYSICS.accel - gravityDrag);
          speed = Math.min(target, speed + effectiveAccel * dt);
        } else {
          // Dynamic smooth braking toward target speed on hills
          const hillDecel = Math.max(
            PHYSICS.coastDecel * 0.8,
            (speed - target) * 2.2 + smoothSlope.current * 9.81 * 0.35
          );
          speed = Math.max(target, speed - hillDecel * dt);
        }
      } else {
        if (target < speed) {
          const gravityDrag = smoothSlope.current * 9.81 * 0.25;
          const effectiveAccel = Math.max(0.65, PHYSICS.accel - gravityDrag);
          speed = Math.max(target, speed - effectiveAccel * dt);
        } else {
          const hillDecel = Math.max(
            PHYSICS.coastDecel * 0.8,
            (target - speed) * 2.2 + smoothSlope.current * 9.81 * 0.35
          );
          speed = Math.min(target, speed + hillDecel * dt);
        }
      }
    } else {
      // Natural coasting deceleration while throttle released
      if (speed > 0) {
        speed = Math.max(0, speed - PHYSICS.coastDecel * dt);
        if (speed <= 0.05) speed = 0;
      } else if (speed < 0) {
        speed = Math.min(0, speed + PHYSICS.coastDecel * dt);
        if (speed >= -0.05) speed = 0;
      }
    }

    const speedFactor = clamp(Math.abs(speed) / PHYSICS.normalMaxSpeed, 0, 1);
    const dir = speed >= 0 ? 1 : -1;
    const yawDelta = steer * PHYSICS.yawRate * speedFactor * dir * dt;
    const nextYaw = yaw + yawDelta;

    const fx = -Math.sin(nextYaw);
    const fz = -Math.cos(nextYaw);
    const moveX = fx * speed * dt;
    const moveZ = fz * speed * dt;

    // Movement resolution with 3D mountain boundary collision & sliding
    const targetX = x + moveX;
    const targetZ = z + moveZ;
    const colFull = checkTruckTerrainCollision(targetX, targetZ, nextYaw);

    if (!colFull.collided) {
      x = targetX;
      z = targetZ;
      yaw = nextYaw;
    } else {
      // Mountain collision detected: resolve by sliding along boundary
      const colX = checkTruckTerrainCollision(targetX, z, nextYaw);
      const colZ = checkTruckTerrainCollision(x, targetZ, nextYaw);

      if (!colX.collided && Math.abs(moveX) > 1e-4) {
        x = targetX;
        yaw = nextYaw;
        speed *= 0.85;
      } else if (!colZ.collided && Math.abs(moveZ) > 1e-4) {
        z = targetZ;
        yaw = nextYaw;
        speed *= 0.85;
      } else {
        const hitDx = x - colFull.hitX;
        const hitDz = z - colFull.hitZ;
        const hitDist = Math.hypot(hitDx, hitDz);
        let slid = false;
        if (hitDist > 1e-4) {
          const nx = hitDx / hitDist;
          const nz = hitDz / hitDist;
          const into = moveX * nx + moveZ * nz;
          if (into < 0) {
            const slideX = moveX - into * nx;
            const slideZ = moveZ - into * nz;
            const colSlide = checkTruckTerrainCollision(x + slideX, z + slideZ, nextYaw);
            if (!colSlide.collided) {
              x += slideX;
              z += slideZ;
              yaw = nextYaw;
              speed *= 0.8;
              slid = true;
            }
          }
        }
        if (!slid) {
          const colYaw = checkTruckTerrainCollision(x, z, nextYaw);
          if (!colYaw.collided) {
            yaw = nextYaw;
          }
          speed = 0;
        }
      }
    }

    const limit = PHYSICS.arenaRadius;
    const dist = Math.hypot(x, z);
    if (dist > limit) {
      const scale = limit / dist;
      x *= scale;
      z *= scale;
      speed *= 0.55;
    }

    const truckR = PHYSICS.truckRadius;
    for (const [bx, bz, br] of BLOCKERS) {
      const dx = x - bx;
      const dz = z - bz;
      const d = Math.hypot(dx, dz);
      const min = br + truckR;
      if (d < min && d > 1e-6) {
        const nx = dx / d;
        const nz = dz / d;
        x = bx + nx * min;
        z = bz + nz * min;
        const curFx = -Math.sin(yaw);
        const curFz = -Math.cos(yaw);
        const into = curFx * nx + curFz * nz;
        if (into > 0) speed *= 1 - into * 0.85;
      }
    }

    // Stable transmission gear determination
    const gear: GearMode = boost
      ? "B"
      : isReversing
        ? "R"
        : (keyThrottle > 0 || speed > 0.1)
          ? "D"
          : (speed === 0 && keyThrottle === 0)
            ? "P"
            : "N";

    // Call setFrame to update speedKmh, gear, and state synchronously
    useSim.getState().setFrame({ x, z, yaw, speed, steer, boost, gear });

    const terrainY = getTerrainElevation(x, z);

    // Natural 3D terrain pitch and roll under vehicle wheelbase & track width
    const curFx = -Math.sin(yaw);
    const curFz = -Math.cos(yaw);
    const curRx = Math.cos(yaw);
    const curRz = -Math.sin(yaw);

    const yFront = getTerrainElevation(x + curFx * 2.2, z + curFz * 2.2);
    const yRear = getTerrainElevation(x - curFx * 2.2, z - curFz * 2.2);
    const yRight = getTerrainElevation(x + curRx * 1.8, z + curRz * 1.8);
    const yLeft = getTerrainElevation(x - curRx * 1.8, z - curRz * 1.8);

    const terrainPitch = Math.atan2(yFront - yRear, 4.4);
    const terrainRoll = -Math.atan2(yRight - yLeft, 3.6);

    if (rigParts.rig) {
      rigParts.rig.position.set(x, terrainY, z);
      rigParts.rig.rotation.y = yaw;
    }

    const accel = dt > 0 ? (speed - prevSpeed.current) / dt : 0;
    prevSpeed.current = speed;

    // Heavy hydro-pneumatic strut suspension spring-damper dynamics
    // Front suspension visibly dips under braking; rear squats under heavy acceleration
    const pitchTarget = clamp(accel * 0.024, -0.065, 0.065);
    const pitchSpring = (pitchTarget - pitchVis.current) * 45.0 - pitchVel.current * 9.5;
    pitchVel.current += pitchSpring * dt;
    pitchVis.current += pitchVel.current * dt;

    // Centrifugal body roll with high-center-of-gravity damping
    const rollTarget = -steer * speedFactor * 0.075;
    const rollSpring = (rollTarget - rollVis.current) * 38.0 - rollVel.current * 8.5;
    rollVel.current += rollSpring * dt;
    rollVis.current += rollVel.current * dt;

    const steerTarget = steer * PHYSICS.maxSteerAngle;
    steerVis.current = damp(steerVis.current, steerTarget, 10, dt);

    const impact = useSensor.getState().impact;
    joltVis.current = damp(joltVis.current, impact, 14, dt);

    if (rigParts.body) {
      rigParts.body.rotation.x = pitchVis.current + terrainPitch;
      rigParts.body.rotation.z = rollVis.current + terrainRoll;
      const clock = state.clock.getElapsedTime();
      const jolt =
        joltVis.current * 0.28 * Math.sin(clock * 16) + joltVis.current * 0.18;
      // Authentic diesel engine rumble when idling or accelerating
      const engineIdle = Math.sin(clock * 30) * 0.003 * (0.4 + 0.6 * (1 - speedFactor));
      const wheelBob = Math.sin(spinAngle.current * 2) * PHYSICS.bobAmount * speedFactor;
      rigParts.body.position.y = DUMPER.chassis.y + jolt + engineIdle + wheelBob;
    }

    if (rigParts.frontLeft) rigParts.frontLeft.rotation.y = steerVis.current;
    if (rigParts.frontRight) rigParts.frontRight.rotation.y = steerVis.current;

    spinAngle.current += (speed / PHYSICS.wheelRadius) * dt;
    for (const spoke of rigParts.spokes) {
      spoke.rotation.x = -spinAngle.current;
    }
  });

  return null;
}