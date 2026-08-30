"use client";

import { useLayoutEffect, useRef } from "react";
import * as THREE from "three";
import { DUMPER } from "@/lib/constants";
import { rigParts } from "@/lib/rig";

const C = {
  body: DUMPER.colors.body,
  bodyDark: DUMPER.colors.bodyDark,
  frame: "#2a2723",
  dark: "#1d1b18",
  glass: DUMPER.colors.window,
  metal: "#948f86",
  tire: DUMPER.colors.tire,
  rim: DUMPER.colors.rim,
  load: "#54472f",
  light: "#fff2c9",
};

const LUGS = Array.from({ length: 5 }, (_, i) => (i * Math.PI * 2) / 5);

interface WheelProps {
  x: number;
  z: number;
  steer?: boolean;
  index: number;
}

function Wheel({ x, z, steer = false, index }: WheelProps) {
  const r = DUMPER.wheelRadius;
  const w = DUMPER.wheelWidth;

  return (
    <group
      position={[x, r, z]}
      ref={(g) => {
        if (steer) {
          if (index === 0) rigParts.frontLeft = g;
          else rigParts.frontRight = g;
        }
      }}
    >
      <mesh
        ref={(m) => {
          if (m) rigParts.spokes.push(m);
        }}
      >
        <mesh castShadow receiveShadow rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[r, r, w, 22]} />
          <meshStandardMaterial color={C.tire} roughness={0.95} />
        </mesh>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[r * 0.9, r * 0.9, w * 1.05, 14]} />
          <meshStandardMaterial color="#1c1d21" roughness={0.9} />
        </mesh>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[r * 0.5, r * 0.5, w * 1.1, 12]} />
          <meshStandardMaterial color={C.rim} roughness={0.45} metalness={0.65} />
        </mesh>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[r * 0.28, r * 0.28, w * 1.14, 10]} />
          <meshStandardMaterial color="#9aa0a3" roughness={0.4} metalness={0.6} />
        </mesh>
        {LUGS.map((a, i) => (
          <group key={i}>
            <mesh position={[0.44, 0.36 * Math.sin(a), 0.36 * Math.cos(a)]}>
              <boxGeometry args={[0.14, 0.18, 0.18]} />
              <meshStandardMaterial color="#9aa0a3" roughness={0.4} metalness={0.6} />
            </mesh>
            <mesh position={[-0.44, 0.36 * Math.sin(a), 0.36 * Math.cos(a)]}>
              <boxGeometry args={[0.14, 0.18, 0.18]} />
              <meshStandardMaterial color="#9aa0a3" roughness={0.4} metalness={0.6} />
            </mesh>
          </group>
        ))}
      </mesh>
    </group>
  );
}

export function Dumper() {
  const rig = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);

  useLayoutEffect(() => {
    if (rig.current) rigParts.rig = rig.current;
    if (body.current) rigParts.body = body.current;
  }, []);

  return (
    <group ref={rig}>
      <group ref={body} position={[0, DUMPER.chassis.y, 0]}>
        <mesh castShadow position={[0, 0.8, 0.3]}>
          <boxGeometry args={[4.4, 0.7, 7.4]} />
          <meshStandardMaterial color={C.frame} roughness={0.9} />
        </mesh>

        <mesh castShadow position={[-2.45, 0.55, 0.3]}>
          <boxGeometry args={[0.4, 0.8, 7.2]} />
          <meshStandardMaterial color={C.dark} roughness={0.9} />
        </mesh>
        <mesh castShadow position={[2.45, 0.55, 0.3]}>
          <boxGeometry args={[0.4, 0.8, 7.2]} />
          <meshStandardMaterial color={C.dark} roughness={0.9} />
        </mesh>

        <mesh castShadow position={[-1.65, 0.5, -2.3]}>
          <boxGeometry args={[3.1, 0.45, 0.8]} />
          <meshStandardMaterial color={C.dark} roughness={0.9} />
        </mesh>
        <mesh castShadow position={[-1.65, 0.5, 0.8]}>
          <boxGeometry args={[3.1, 0.45, 0.8]} />
          <meshStandardMaterial color={C.dark} roughness={0.9} />
        </mesh>
        <mesh castShadow position={[-1.65, 0.5, 2.6]}>
          <boxGeometry args={[3.1, 0.45, 0.8]} />
          <meshStandardMaterial color={C.dark} roughness={0.9} />
        </mesh>

        <mesh castShadow position={[0, 0.1, -4.05]}>
          <boxGeometry args={[3.1, 0.6, 0.55]} />
          <meshStandardMaterial color={C.dark} roughness={0.8} />
        </mesh>
        <mesh castShadow position={[0, 1.0, -4.05]}>
          <boxGeometry args={[2.5, 0.65, 0.3]} />
          <meshStandardMaterial color={C.dark} roughness={0.8} />
        </mesh>

        <mesh castShadow position={[-0.9, 1.22, -4.28]}>
          <boxGeometry args={[0.5, 0.22, 0.08]} />
          <meshStandardMaterial color={C.light} emissive={C.light} emissiveIntensity={0.9} />
        </mesh>
        <mesh castShadow position={[0.9, 1.22, -4.28]}>
          <boxGeometry args={[0.5, 0.22, 0.08]} />
          <meshStandardMaterial color={C.light} emissive={C.light} emissiveIntensity={0.9} />
        </mesh>

        <mesh castShadow position={[0, 1.6, -3.25]}>
          <boxGeometry args={[2.5, 1.2, 1.6]} />
          <meshStandardMaterial color={C.body} roughness={0.55} />
        </mesh>
        <mesh castShadow position={[0, 2.5, -3.1]}>
          <boxGeometry args={[2.8, 0.35, 1.9]} />
          <meshStandardMaterial color={C.bodyDark} roughness={0.55} />
        </mesh>
        <mesh castShadow position={[0, 2.76, -2.4]}>
          <boxGeometry args={[2.6, 0.2, 0.9]} />
          <meshStandardMaterial color={C.bodyDark} roughness={0.55} />
        </mesh>

        <mesh castShadow position={[0, 2.0, -4.06]}>
          <boxGeometry args={[2.4, 0.72, 0.12]} />
          <meshStandardMaterial color={C.glass} roughness={0.25} metalness={0.7} />
        </mesh>
        <mesh castShadow position={[-1.31, 1.9, -3.25]}>
          <boxGeometry args={[0.1, 0.6, 1.25]} />
          <meshStandardMaterial color={C.glass} roughness={0.25} metalness={0.7} />
        </mesh>
        <mesh castShadow position={[1.31, 1.9, -3.25]}>
          <boxGeometry args={[0.1, 0.6, 1.25]} />
          <meshStandardMaterial color={C.glass} roughness={0.25} metalness={0.7} />
        </mesh>

        <mesh castShadow position={[-1.18, 2.55, -2.2]}>
          <cylinderGeometry args={[0.11, 0.15, 1.5, 10]} />
          <meshStandardMaterial color={C.metal} roughness={0.5} metalness={0.5} />
        </mesh>
        <mesh castShadow position={[1.18, 2.55, -2.2]}>
          <cylinderGeometry args={[0.11, 0.15, 1.5, 10]} />
          <meshStandardMaterial color={C.metal} roughness={0.5} metalness={0.5} />
        </mesh>

        <mesh castShadow position={[-1.45, 1.75, -3.3]}>
          <boxGeometry args={[0.12, 1.15, 0.12]} />
          <meshStandardMaterial color={C.bodyDark} roughness={0.6} />
        </mesh>
        <mesh castShadow position={[1.45, 1.75, -3.3]}>
          <boxGeometry args={[0.12, 1.15, 0.12]} />
          <meshStandardMaterial color={C.bodyDark} roughness={0.6} />
        </mesh>

        <mesh castShadow position={[1, 3.25, -3.6]}>
          <cylinderGeometry args={[0.045, 0.045, 1.2, 6]} />
          <meshStandardMaterial color={C.metal} roughness={0.4} metalness={0.5} />
        </mesh>
        <mesh position={[1, 3.9, -3.6]}>
          <sphereGeometry args={[0.09, 8, 6]} />
          <meshStandardMaterial color="#e8562d" emissive="#e8562d" emissiveIntensity={0.6} />
        </mesh>

        <mesh castShadow position={[0, 2.05, 0.9]}>
          <boxGeometry args={[5.3, 0.7, 4.6]} />
          <meshStandardMaterial color={C.body} roughness={0.6} />
        </mesh>
        <mesh castShadow position={[0, 3.05, 0.9]}>
          <boxGeometry args={[4.95, 1.15, 4.25]} />
          <meshStandardMaterial color={C.load} roughness={1} />
        </mesh>
        <mesh castShadow position={[0, 3.4, -1.55]}>
          <boxGeometry args={[5.4, 2.1, 0.45]} />
          <meshStandardMaterial color={C.body} roughness={0.6} />
        </mesh>
        <mesh castShadow position={[-2.95, 3.4, 0.9]}>
          <boxGeometry args={[0.45, 2.1, 4.6]} />
          <meshStandardMaterial color={C.body} roughness={0.6} />
        </mesh>
        <mesh castShadow position={[2.95, 3.4, 0.9]}>
          <boxGeometry args={[0.45, 2.1, 4.6]} />
          <meshStandardMaterial color={C.body} roughness={0.6} />
        </mesh>
        <mesh castShadow position={[0, 3.4, 3.35]}>
          <boxGeometry args={[4.6, 2.0, 0.5]} />
          <meshStandardMaterial color={C.bodyDark} roughness={0.6} />
        </mesh>

        <mesh castShadow position={[0, 3.55, -1.38]}>
          <boxGeometry args={[5.6, 0.3, 0.3]} />
          <meshStandardMaterial color={C.bodyDark} roughness={0.55} />
        </mesh>
        <mesh castShadow position={[0, 3.55, 2.85]}>
          <boxGeometry args={[4.9, 0.3, 0.3]} />
          <meshStandardMaterial color={C.bodyDark} roughness={0.55} />
        </mesh>
        <mesh castShadow position={[-2.78, 3.55, 0.9]}>
          <boxGeometry args={[0.3, 0.3, 4.35]} />
          <meshStandardMaterial color={C.bodyDark} roughness={0.55} />
        </mesh>
        <mesh castShadow position={[2.78, 3.55, 0.9]}>
          <boxGeometry args={[0.3, 0.3, 4.35]} />
          <meshStandardMaterial color={C.bodyDark} roughness={0.55} />
        </mesh>

        <mesh castShadow position={[-1.5, 3.15, -1.6]}>
          <boxGeometry args={[0.35, 0.35, 2.2]} />
          <meshStandardMaterial color={C.frame} roughness={0.7} />
        </mesh>
        <mesh castShadow position={[1.5, 3.15, -1.6]}>
          <boxGeometry args={[0.35, 0.35, 2.2]} />
          <meshStandardMaterial color={C.frame} roughness={0.7} />
        </mesh>

        <mesh castShadow position={[0, 0.7, 3.9]}>
          <boxGeometry args={[3.6, 0.6, 0.4]} />
          <meshStandardMaterial color={C.dark} roughness={0.9} />
        </mesh>
        <mesh castShadow position={[0, 0.85, 3.55]}>
          <boxGeometry args={[2.8, 1.1, 0.08]} />
          <meshStandardMaterial color={C.dark} roughness={1} />
        </mesh>
      </group>

      <Wheel x={-DUMPER.frontX} z={DUMPER.frontZ} steer index={0} />
      <Wheel x={DUMPER.frontX} z={DUMPER.frontZ} steer index={1} />
      <Wheel x={-DUMPER.rearX} z={DUMPER.rearZ1} index={2} />
      <Wheel x={DUMPER.rearX} z={DUMPER.rearZ1} index={3} />
      <Wheel x={-DUMPER.rearX} z={DUMPER.rearZ2} index={4} />
      <Wheel x={DUMPER.rearX} z={DUMPER.rearZ2} index={5} />
    </group>
  );
}