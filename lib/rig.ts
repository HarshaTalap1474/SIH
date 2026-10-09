import type * as THREE from "three";

export interface RigParts {
  rig: THREE.Group | null;
  body: THREE.Group | null;
  frontLeft: THREE.Group | null;
  frontRight: THREE.Group | null;
  spokes: THREE.Mesh[];
}

export const rigParts: RigParts = {
  rig: null,
  body: null,
  frontLeft: null,
  frontRight: null,
  spokes: [],
};