"use client";

import { useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { CAMERA, SCENE, SENSOR, angleDeltaDeg, clamp, damp, getRoadElevation } from "@/lib/constants";
import { useSim } from "@/lib/simStore";
import { useSensor } from "@/lib/virtualSensor";

const DEG = Math.PI / 180;

export function CameraRig() {
  const camPos = useRef(
    new THREE.Vector3(SCENE.cameraStart.x, SCENE.cameraStart.y, SCENE.cameraStart.z)
  );
  const lookTarget = useRef(new THREE.Vector3(0, CAMERA.lookHeight, 0));
  const currentFov = useRef(55);
  const smoothYaw = useRef(0);
  const prevSpeed = useRef(0);
  const speedInertia = useRef(0);
  const steerLook = useRef(0);
  const initialized = useRef(false);

  useFrame(({ camera }, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const sim = useSim.getState();

    // Initialize smoothYaw to initial vehicle yaw on mount
    if (!initialized.current) {
      smoothYaw.current = sim.yaw;
      initialized.current = true;
    }

    // Dynamic inertia calculation from vehicle acceleration
    const accel = dt > 0 ? (sim.speed - prevSpeed.current) / dt : 0;
    prevSpeed.current = sim.speed;
    const speedFrac = clamp(Math.abs(sim.speed) / 11, 0, 1);

    // Dynamic camera distance inertia (lags back on accel, presses forward on brake)
    const targetInertia = clamp(accel * 0.18, -1.8, 2.2);
    speedInertia.current = damp(speedInertia.current, targetInertia, 4.5, dt);

    // Dynamic steer apex look-ahead
    const targetSteerLook = sim.steer * 2.8 * (0.3 + 0.7 * speedFrac);
    steerLook.current = damp(steerLook.current, targetSteerLook, 5.0, dt);

    // Smooth rotational follow for chase camera (Euro Truck Simulator 2 style orbit lag)
    let yawDiff = (sim.yaw - smoothYaw.current) % (Math.PI * 2);
    if (yawDiff > Math.PI) yawDiff -= Math.PI * 2;
    if (yawDiff < -Math.PI) yawDiff += Math.PI * 2;
    smoothYaw.current += yawDiff * (1 - Math.exp(-4.2 * dt));

    let tx: number;
    let ty: number;
    let tz: number;
    let lx: number = sim.x;
    let ly: number = CAMERA.lookHeight;
    let lz: number = sim.z;
    let targetFov = 55;

    const fwdX = -Math.sin(sim.yaw);
    const fwdZ = -Math.cos(sim.yaw);
    const rightX = Math.cos(sim.yaw);
    const rightZ = -Math.sin(sim.yaw);

    const clock = performance.now() / 1000;
    const truckY = getRoadElevation(sim.x, sim.z);

    if (sim.camMode === "top") {
      tx = sim.x - fwdX * CAMERA.topOffsetZ;
      ty = truckY + CAMERA.topHeight;
      tz = sim.z - fwdZ * CAMERA.topOffsetZ;
      lx = sim.x + fwdX * 4;
      ly = truckY;
      lz = sim.z + fwdZ * 4;
      targetFov = 50;
    } else if (sim.camMode === "cockpit") {
      // Driver seat inside the cab (left-side driver position, looking out through windshield)
      targetFov = 68;
      const cabX = -0.45;
      const cabZ = 4.12; // forward position right at the windshield plane

      tx = sim.x + rightX * cabX + fwdX * cabZ;
      ty = truckY + 3.65;
      tz = sim.z + rightZ * cabX + fwdZ * cabZ;

      // Realistic cabin cockpit pitch and roll reaction to braking and acceleration
      const cabPitch = clamp(-accel * 0.012, -0.04, 0.04);
      ty += cabPitch;

      // Look forward along haul road with dynamic look-ahead into turns
      const lookDist = 36;
      const baseLx = tx + fwdX * lookDist + rightX * (steerLook.current * 2.2);
      const baseLy = 2.3 + cabPitch * 10; // slight pitch gaze into braking
      const baseLz = tz + fwdZ * lookDist + rightZ * (steerLook.current * 2.2);

      lx = baseLx;
      ly = truckY + baseLy;
      lz = baseLz;

      // Subtle engine vibration and high-mass road breathing
      const engineVibe = 0.005 * Math.sin(clock * 32) * (0.35 + 0.65 * speedFrac);
      const roadBreathe = 0.012 * Math.sin(clock * 4.2) * speedFrac;
      ty += engineVibe + roadBreathe;
    } else {
      // Dynamic realistic chase camera (ETS2 inspired)
      targetFov = 54 + speedFrac * 4; // subtle high-speed FOV expansion

      const sensor = useSensor.getState();
      const t = clamp(
        (sensor.tiltK - SENSOR.deadzoneK) / (1 - SENSOR.deadzoneK),
        0,
        1
      );
      const w = t * t * (3 - 2 * t);
      const thetaDeg =
        CAMERA.idleAngleDeg + angleDeltaDeg(sensor.yawHeading, CAMERA.idleAngleDeg) * w;
      const theta = thetaDeg * DEG;
      const pitchFrac = clamp(Math.abs(sensor.pitch) / SENSOR.maxPitchDeg, 0, 1);

      // Base chase distance modulated by inertia (pulls back on accel, compresses on braking)
      const dynamicDist = CAMERA.chaseDist + speedInertia.current * 0.8;
      const height =
        CAMERA.chaseHeight +
        (CAMERA.orbitHeight - CAMERA.chaseHeight) * pitchFrac -
        speedInertia.current * 0.25;

      // Follow smoothed vehicle heading for natural trailer/body trailing
      const ang = theta + smoothYaw.current;
      tx = sim.x + Math.cos(ang) * dynamicDist;
      ty = truckY + height;
      tz = sim.z - Math.sin(ang) * dynamicDist;

      // Subtle road breathing (high-mass vehicle suspension sensation)
      const roadSway = Math.sin(clock * 2.8) * 0.025 * speedFrac;
      ty += roadSway;

      // Look ahead of the truck with turn apex anticipation
      lx = sim.x + fwdX * 4.5 + rightX * steerLook.current;
      ly = truckY + CAMERA.lookHeight + roadSway * 0.5;
      lz = sim.z + fwdZ * 4.5 + rightZ * steerLook.current;
    }

    // Dynamic FOV interpolation
    if (camera instanceof THREE.PerspectiveCamera) {
      currentFov.current += (targetFov - currentFov.current) * (1 - Math.exp(-6 * dt));
      camera.fov = currentFov.current;
      camera.updateProjectionMatrix();
    }

    const dampSpeed =
      sim.camMode === "cockpit"
        ? 1 - Math.exp(-24 * dt)
        : 1 - Math.exp(-CAMERA.dampLambda * dt);

    camPos.current.x += (tx - camPos.current.x) * dampSpeed;
    camPos.current.y += (ty - camPos.current.y) * dampSpeed;
    camPos.current.z += (tz - camPos.current.z) * dampSpeed;
    if (camPos.current.y < 1.4) camPos.current.y = 1.4;

    lookTarget.current.x += (lx - lookTarget.current.x) * dampSpeed;
    lookTarget.current.y += (ly - lookTarget.current.y) * dampSpeed;
    lookTarget.current.z += (lz - lookTarget.current.z) * dampSpeed;

    // Road impact / pothole camera jolt (natural damped bump)
    const impact = useSensor.getState().impact;
    if (impact > 0.02) {
      const amp = impact * (sim.camMode === "cockpit" ? 0.08 : 0.035);
      camPos.current.x += Math.sin(clock * 61) * amp;
      camPos.current.y += Math.sin(clock * 47) * amp * 0.6;
      camPos.current.z += Math.sin(clock * 53) * amp;
    }

    camera.position.copy(camPos.current);
    camera.up.set(0, 1, 0);
    camera.lookAt(lookTarget.current.x, lookTarget.current.y, lookTarget.current.z);
  });

  return null;
}