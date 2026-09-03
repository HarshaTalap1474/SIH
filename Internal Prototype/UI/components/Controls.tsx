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
  const aebLatched = useRef(false);
  const prevEstop = useRef(false);

  useEffect(() => {
    adasClient.init();
    hwClient.init();
  }, []);

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    useSensor.getState().tick(dt);

    const sim = useSim.getState();
    let { x, z, yaw, speed, steer, boost } = sim;

    // ADAS TinyML Perception & Telemetry update
    adasClient.update(x, z, yaw, speed, steer);
    const adas = useAdasStore.getState();

    const hw = useHardwareStore.getState();
    const connected = hw.connected;

    // Hardware buttons
    const hwThrottle = hw.buttons.throttle ? 1 : 0;
    const hwBrake = hw.buttons.brake ? -1 : 0;
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
        keyThrottle = 1;
      } else {
        keyThrottle = hwThrottle + hwBrake;
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

    // E-Stop: when hw.buttons.estop transitions to true, latch AEB immediately
    if (connected && hw.buttons.estop && !prevEstop.current) {
      aebLatched.current = true;
    }
    prevEstop.current = connected ? hw.buttons.estop : false;

    // Active Reversing condition (driver pressing 'S'/brake or moving backward)
    const isReversing = keyThrottle < 0 || (speed < -0.05 && keyThrottle <= 0);

    // AEB Latch: If emergency brake triggers OR obstacle is within 4.8m in front of bumper
    if (adas.emergencyBrake || adas.closestObstacleM < 4.8) {
      if (!isReversing) {
        aebLatched.current = true;
      }
    }

    // Release AEB Latch when:
    // 1. Driver has reversed away or steered so clearance opens up (> 6.0m)
    // 2. OR driver is actively in reverse
    if (adas.closestObstacleM > 6.0 && !adas.emergencyBrake) {
      aebLatched.current = false;
    }
    if (isReversing && speed < -0.05) {
      aebLatched.current = false;
    }

    const isBlockedAhead = (aebLatched.current || adas.emergencyBrake) && !isReversing;

    let throttle = keyThrottle;
    if (isBlockedAhead && throttle > 0) {
      throttle = 0; // Cut forward throttle completely
    }

    const maxSpeed = boost
      ? PHYSICS.boostMaxSpeed
      : throttle >= 0
        ? PHYSICS.normalMaxSpeed
        : PHYSICS.reverseMaxSpeed;
    const target = throttle * maxSpeed;

    if (isBlockedAhead) {
      // Rapidly bring speed to 0 and hold strictly at 0
      if (speed > 0.01) {
        speed = Math.max(0, speed - PHYSICS.brake * 4.0 * dt);
      } else {
        speed = 0;
      }
    } else if (Math.abs(throttle) > PHYSICS.throttleDeadzone) {
      if (target > speed) {
        speed = Math.min(target, speed + PHYSICS.accel * dt);
      } else {
        speed = Math.max(target, speed - PHYSICS.brake * dt);
      }
    } else {
      const dir = Math.sign(speed);
      speed -= dir * Math.min(Math.abs(speed), PHYSICS.coastDecel * dt);
      if (Math.sign(speed) !== dir) speed = 0;
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