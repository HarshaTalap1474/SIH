"use client";

import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { BLOCKERS, DUMPER, PHYSICS, clamp, damp } from "@/lib/constants";
import { isKeyDown } from "@/lib/keys";
import { useSensor } from "@/lib/virtualSensor";
import { useSim, GearMode } from "@/lib/simStore";
import { rigParts } from "@/lib/rig";
import { adasClient, useAdasStore } from "@/lib/mlClient";
import { hwClient, useHardwareStore } from "@/lib/hardwareClient";

export function Controls() {
  const prevSpeed = useRef(0);
  const pitchVis = useRef(0);
  const rollVis = useRef(0);
  const steerVis = useRef(0);
  const spinAngle = useRef(0);
  const joltVis = useRef(0);
  const estopLatched = useRef(false); // physical E-Stop — clears on button release, disconnect, or X key
  const prevEstop = useRef(false);
  const prevXKey = useRef(false);

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

    // Obstacle clearance measurements in travel direction using existing sensor perception
    const STOP_CLEARANCE = 2.5;  // 2.5 meters actual obstacle clearance stop distance
    // Dynamic braking range: in Boost mode, start gradual deceleration at 28m to allow smooth progressive slowing from 75 km/h
    const isBoostActive = boost || Math.abs(speed) > PHYSICS.normalMaxSpeed;
    const slowClearance = isBoostActive ? 28.0 : 10.0;

    // Forward threat clearance: front center ray and front left/right angled rays
    const frontRayDist = Math.min(
      adas.rays.center,
      adas.rays.left < 15 ? adas.rays.left * 1.3 : 99,
      adas.rays.right < 15 ? adas.rays.right * 1.3 : 99
    );
    const forwardClearance = !isReversing
      ? Math.min(adas.closestObstacleM, frontRayDist)
      : frontRayDist;

    // Rear threat clearance: rear center ray and rear left/right angled rays
    const rearCenterRay = adas.rays.rearCenter ?? adas.rays.rear ?? 99;
    const rearRayDist = Math.min(
      rearCenterRay,
      adas.rays.rearLeft < 15 ? adas.rays.rearLeft * 1.3 : 99,
      adas.rays.rearRight < 15 ? adas.rays.rearRight * 1.3 : 99
    );
    const rearClearance = isReversing
      ? Math.min(adas.closestObstacleM, rearRayDist)
      : rearRayDist;

    // Critical 2.5-meter stop zones (safety stopping threshold: 2.50m - 2.65m)
    const isStopZoneAhead = forwardClearance <= STOP_CLEARANCE + 0.15;
    const isStopZoneBehind = rearClearance <= STOP_CLEARANCE + 0.15;

    // Obstacle safety stop detection (truck has reached 0 km/h specifically because obstacle safety stopped it)
    const isObstacleSafetyStoppedAhead = isStopZoneAhead && speed <= 0.1 && !isReversing;
    const isObstacleSafetyStoppedBehind = isStopZoneBehind && speed >= -0.1 && isReversing;
    const isObstacleSafetyStopped = isObstacleSafetyStoppedAhead || isObstacleSafetyStoppedBehind;

    // Autonomous Emergency Brake & E-Stop Interlock (final safety layer)
    const isEStopped = estopLatched.current;
    const isAebForward = (adas.emergencyBrake || isStopZoneAhead || isObstacleSafetyStoppedAhead) && !isReversing;
    const isAebRear = (adas.emergencyBrake || isStopZoneBehind || isObstacleSafetyStoppedBehind) && isReversing;

    const isBlockedAhead = isEStopped || isAebForward;
    const isBlockedBehind = isEStopped || isAebRear;

    let throttle = keyThrottle;
    if (isBlockedAhead && throttle > 0) throttle = 0;
    if (isBlockedBehind && throttle < 0) throttle = 0;

    // Immediately synchronize the emergency brake status with ZERO delay when stopped by safety system
    if (isObstacleSafetyStopped && (!adas.emergencyBrake || adas.collisionRisk !== "CRITICAL")) {
      useAdasStore.getState().setAdasResult({
        emergencyBrake: true,
        collisionRisk: "CRITICAL",
        threatDirection: isReversing ? "REAR" : "FRONT",
      });
    }

    const maxSpeed = boost
      ? PHYSICS.boostMaxSpeed
      : throttle >= 0
        ? PHYSICS.normalMaxSpeed
        : PHYSICS.reverseMaxSpeed;

    // Progressive distance-based target speed calculation
    let target = throttle * maxSpeed;

    if (throttle > 0 && !isBlockedAhead) {
      if (forwardClearance <= STOP_CLEARANCE) {
        target = 0;
      } else if (forwardClearance < slowClearance) {
        // Smooth progressive slowdown curve: ratio = (d - 2.5m) / (slowClearance - 2.5m)
        const normDist = clamp((forwardClearance - STOP_CLEARANCE) / (slowClearance - STOP_CLEARANCE), 0, 1);
        const speedRatio = Math.pow(normDist, 1.25);
        const allowedSpeed = maxSpeed * speedRatio;
        target = Math.min(target, allowedSpeed);
      }
    } else if (throttle < 0 && !isBlockedBehind) {
      if (rearClearance <= STOP_CLEARANCE) {
        target = 0;
      } else if (rearClearance < slowClearance) {
        const normDist = clamp((rearClearance - STOP_CLEARANCE) / (slowClearance - STOP_CLEARANCE), 0, 1);
        const speedRatio = Math.pow(normDist, 1.25);
        const allowedSpeed = maxSpeed * speedRatio;
        target = Math.max(target, -allowedSpeed);
      }
    }

    // Smooth speed tracking with progressive deceleration and anti-oscillation
    if (isBlockedAhead && speed > 0) {
      // Hold complete stop or apply emergency braking at critical 2.5m threshold
      const stopBrake = isStopZoneAhead && speed < 1.5 ? PHYSICS.brake * 2.0 : PHYSICS.brake * 4.0;
      speed = Math.max(0, speed - stopBrake * dt);
      if (speed <= 0.05) speed = 0;
    } else if (isBlockedBehind && speed < 0) {
      const stopBrake = isStopZoneBehind && speed > -1.5 ? PHYSICS.brake * 2.0 : PHYSICS.brake * 4.0;
      speed = Math.min(0, speed + stopBrake * dt);
      if (speed >= -0.05) speed = 0;
    } else if (Math.abs(throttle) > PHYSICS.throttleDeadzone) {
      if (throttle > 0) {
        if (target > speed) {
          speed = Math.min(target, speed + PHYSICS.accel * dt);
        } else {
          // Dynamic smooth braking toward progressively decreasing target speed
          const decel = Math.max(PHYSICS.brake, (speed - target) * 3.5);
          speed = Math.max(target, speed - decel * dt);
        }
      } else {
        if (target < speed) {
          speed = Math.max(target, speed - PHYSICS.accel * dt);
        } else {
          const decel = Math.max(PHYSICS.brake, (target - speed) * 3.5);
          speed = Math.min(target, speed + decel * dt);
        }
      }
    } else {
      // Coasting deceleration or obstacle approach deceleration while throttle released
      if (speed > 0) {
        let coastTarget = 0;
        if (forwardClearance < slowClearance) {
          const normDist = clamp((forwardClearance - STOP_CLEARANCE) / (slowClearance - STOP_CLEARANCE), 0, 1);
          coastTarget = Math.min(speed, maxSpeed * Math.pow(normDist, 1.25));
        }
        const decel = speed > coastTarget ? PHYSICS.brake : PHYSICS.coastDecel;
        speed = Math.max(coastTarget, speed - decel * dt);
        if (speed <= 0.05 && coastTarget === 0) speed = 0;
      } else if (speed < 0) {
        let coastTarget = 0;
        if (rearClearance < slowClearance) {
          const normDist = clamp((rearClearance - STOP_CLEARANCE) / (slowClearance - STOP_CLEARANCE), 0, 1);
          coastTarget = Math.max(speed, -maxSpeed * Math.pow(normDist, 1.25));
        }
        const decel = speed < coastTarget ? PHYSICS.brake : PHYSICS.coastDecel;
        speed = Math.min(coastTarget, speed + decel * dt);
        if (speed >= -0.05 && coastTarget === 0) speed = 0;
      }
    }

    const speedFactor = clamp(Math.abs(speed) / PHYSICS.normalMaxSpeed, 0, 1);
    const dir = speed >= 0 ? 1 : -1;
    yaw += steer * PHYSICS.yawRate * speedFactor * dir * dt;

    const fx = -Math.sin(yaw);
    const fz = -Math.cos(yaw);
    x += fx * speed * dt;
    z += fz * speed * dt;

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
        const into = fx * nx + fz * nz;
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

    if (rigParts.rig) {
      rigParts.rig.position.set(x, 0, z);
      rigParts.rig.rotation.y = yaw;
    }

    const accel = dt > 0 ? (speed - prevSpeed.current) / dt : 0;
    prevSpeed.current = speed;
    const pitchTarget = clamp(accel * PHYSICS.pitchFromAccel, -PHYSICS.pitchClamp, PHYSICS.pitchClamp);
    const rollTarget = -steer * speedFactor * PHYSICS.rollFromSteer;
    pitchVis.current = damp(pitchVis.current, pitchTarget, 6, dt);
    rollVis.current = damp(rollVis.current, rollTarget, 6, dt);

    const steerTarget = steer * PHYSICS.maxSteerAngle;
    steerVis.current = damp(steerVis.current, steerTarget, 8, dt);

    const impact = useSensor.getState().impact;
    joltVis.current = damp(joltVis.current, impact, 14, dt);

    if (rigParts.body) {
      rigParts.body.rotation.x = pitchVis.current;
      rigParts.body.rotation.z = rollVis.current;
      const clock = state.clock.getElapsedTime();
      const jolt =
        joltVis.current * 0.28 * Math.sin(clock * 16) + joltVis.current * 0.18;
      rigParts.body.position.y =
        DUMPER.chassis.y +
        jolt +
        Math.sin(spinAngle.current * 2) * PHYSICS.bobAmount * speedFactor;
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