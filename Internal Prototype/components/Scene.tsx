"use client";

import { Canvas } from "@react-three/fiber";
import { SCENE } from "@/lib/constants";
import { Dumper } from "./Dumper";
import { Controls } from "./Controls";
import { CameraRig } from "./CameraRig";
import { Terrain } from "./Terrain";

export function Scene() {

  return (
    <Canvas
      shadows
      dpr={[1, 1.5]}
      camera={{ fov: 55, near: 0.1, far: 600, position: [0, 6, 8] }}
    >
      <color attach="background" args={[SCENE.background]} />
      <fog attach="fog" args={[SCENE.fogColor, SCENE.fogNear, SCENE.fogFar]} />

      <hemisphereLight args={["#f2ead6", "#4a3f31", 0.9]} />
      <directionalLight
        position={[40, 55, 20]}
        intensity={1.6}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-95}
        shadow-camera-right={95}
        shadow-camera-top={95}
        shadow-camera-bottom={-95}
        shadow-camera-near={1}
        shadow-camera-far={220}
      />
      <ambientLight intensity={0.25} />

      <Terrain />
      <group>
        <Dumper />
      </group>
      <Controls />
      <CameraRig />
    </Canvas>
  );
}