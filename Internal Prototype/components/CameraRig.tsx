"use client";

import { useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { CAMERA, SCENE, SENSOR, angleDeltaDeg, clamp } from "@/lib/constants";
import { useSim } from "@/lib/simStore";
import { useSensor } from "@/lib/virtualSensor";

const DEG = Math.PI / 180;

export function CameraRig() {
  const camPos = useRef(
    new THREE.Vector3(SCENE.cameraStart.x, SCENE.cameraStart.y, SCENE.cameraStart.z)
  );
  const lookTarget = useRef(new THREE.Vector3(0, CAMERA.lookHeight, 0));
  const currentFov = useRef(55);

  useFrame(({ camera }, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const k = 1 - Math.exp(-CAMERA.dampLambda * dt);
    const sim = useSim.getState();

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

    if (sim.camMode === "top") {
      tx = sim.x + fwdX * 4;
      ty = CAMERA.topHeight;
      tz = sim.z + fwdZ * CAMERA.topOffsetZ;
      lx = sim.x;
      ly = 0;
      lz = sim.z;
      targetFov = 50;
    } else if (sim.camMode === "cockpit") {
      // Driver seat inside the cab (left-side driver position, looking out through windshield)
      targetFov = 68;
      const cabX = -0.45;
      const cabZ = 3.45; // forward in truck space towards negative Z

      tx = sim.x + rightX * cabX + fwdX * cabZ;
      ty = 3.68;
      tz = sim.z + rightZ * cabX + fwdZ * cabZ;

      // Look forward along haul road with dynamic look-ahead into turns
      const lookDist = 35;
      const steerLookAhead = sim.steer * 4.5;
      lx = tx + fwdX * lookDist + rightX * steerLookAhead;
      ly = 2.2; // slight downward gaze towards road surface
      lz = tz + fwdZ * lookDist + rightZ * steerLookAhead;

      // Subtle engine vibration in cabin
      const clock = performance.now() / 1000;
      const speedFrac = clamp(Math.abs(sim.speed) / 11, 0, 1);
      const engineVibe = 0.006 * Math.sin(clock * 32) * (0.4 + 0.6 * speedFrac);
      ty += engineVibe;
    } else {
      // Dynamic chase camera
      targetFov = 55;
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
      const height =
        CAMERA.chaseHeight + (CAMERA.orbitHeight - CAMERA.chaseHeight) * pitchFrac;

      const ang = theta + sim.yaw;
      tx = sim.x + Math.cos(ang) * CAMERA.chaseDist;
      ty = height;
      tz = sim.z - Math.sin(ang) * CAMERA.chaseDist;

      // Look ahead of the truck
      lx = sim.x + fwdX * 3.5;
      ly = CAMERA.lookHeight;
      lz = sim.z + fwdZ * 3.5;
    }

    // Dynamic FOV interpolation
    if (camera instanceof THREE.PerspectiveCamera) {
      currentFov.current += (targetFov - currentFov.current) * (1 - Math.exp(-6 * dt));
      camera.fov = currentFov.current;
      camera.updateProjectionMatrix();
    }

    const dampSpeed = sim.camMode === "cockpit" ? 1 - Math.exp(-22 * dt) : k;
    camPos.current.x += (tx - camPos.current.x) * dampSpeed;
    camPos.current.y += (ty - camPos.current.y) * dampSpeed;
    camPos.current.z += (tz - camPos.current.z) * dampSpeed;
    if (camPos.current.y < 1.4) camPos.current.y = 1.4;

    lookTarget.current.x += (lx - lookTarget.current.x) * dampSpeed;
    lookTarget.current.y += (ly - lookTarget.current.y) * dampSpeed;
    lookTarget.current.z += (lz - lookTarget.current.z) * dampSpeed;

    // Road impact / pothole camera jolt
    const impact = useSensor.getState().impact;
    if (impact > 0.02) {
      const clock = performance.now() / 1000;
      const amp = impact * (sim.camMode === "cockpit" ? 0.14 : 0.06);
      camPos.current.x += Math.sin(clock * 61) * amp;
      camPos.current.y += Math.sin(clock * 47) * amp * 0.7;
      camPos.current.z += Math.sin(clock * 53) * amp;
    }

    camera.position.copy(camPos.current);
    camera.lookAt(lookTarget.current.x, lookTarget.current.y, lookTarget.current.z);
  });

  return null;
}