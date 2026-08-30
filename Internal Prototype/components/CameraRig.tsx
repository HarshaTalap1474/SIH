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

  useFrame(({ camera }, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const k = 1 - Math.exp(-CAMERA.dampLambda * dt);
    const sim = useSim.getState();

    let tx: number;
    let ty: number;
    let tz: number;

    if (sim.camMode === "top") {
      const fwdX = -Math.sin(sim.yaw);
      const fwdZ = -Math.cos(sim.yaw);
      tx = sim.x + fwdX * 4;
      ty = CAMERA.topHeight;
      tz = sim.z + fwdZ * CAMERA.topOffsetZ;
    } else {
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
    }

    camPos.current.x += (tx - camPos.current.x) * k;
    camPos.current.y += (ty - camPos.current.y) * k;
    camPos.current.z += (tz - camPos.current.z) * k;
    if (camPos.current.y < 1.4) camPos.current.y = 1.4;

    const impact = useSensor.getState().impact;
    if (impact > 0.02) {
      const clock = performance.now() / 1000;
      const amp = impact * 0.06;
      camPos.current.x += Math.sin(clock * 61) * amp;
      camPos.current.y += Math.sin(clock * 47) * amp * 0.6;
      camPos.current.z += Math.sin(clock * 53) * amp;
    }

    camera.position.copy(camPos.current);
    camera.lookAt(sim.x, CAMERA.lookHeight, sim.z);
  });

  return null;
}