"use client";

import { Canvas } from "@react-three/fiber";
import { SCENE } from "@/lib/constants";
import { Dumper } from "./Dumper";
import { Controls } from "./Controls";
import { CameraRig } from "./CameraRig";
import { Terrain } from "./Terrain";
import { useSim } from "@/lib/simStore";

function FogEnvironment() {
  const fogMode = useSim((s) => s.fogMode);

  const [fogNear, fogFar] =
    fogMode === "heavy"
      ? [18, 120]
      : fogMode === "medium"
      ? [45, 200]
      : [120, 450];

  return (
    <>
      <color attach="background" args={[SCENE.background]} />
      <fog attach="fog" args={[SCENE.fogColor, fogNear, fogFar]} />
    </>
  );
}

export function Scene() {
  return (
    <Canvas
      shadows
      dpr={[1, 1.5]}
      camera={{ fov: 55, near: 0.5, far: 500, position: [0, 6, 8] }}
      gl={{
        antialias: true,
        powerPreference: "high-performance",
      }}
    >
      <FogEnvironment />

      {/* Atmospheric Iron-Ore Quarry Lighting */}
      <hemisphereLight args={["#fde68a", "#38231a", 0.8]} />
      <directionalLight
        position={[60, 80, 40]}
        intensity={1.9}
        castShadow
        shadow-bias={-0.0003}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-110}
        shadow-camera-right={110}
        shadow-camera-top={110}
        shadow-camera-bottom={-110}
        shadow-camera-near={1}
        shadow-camera-far={260}
      />
      <ambientLight intensity={0.35} />

      <Terrain />
      <Dumper />
      <Controls />
      <CameraRig />
    </Canvas>
  );
}