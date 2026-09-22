# HEMM Dumper Simulator — SIH Prototype (Next.js + Three.js)

An interactive **full-screen 3D** HEMM dumper truck simulator for Smart India Hackathon.
Drive with the keyboard **and/or** the **Virtual Tilt Pad** (our MPU6050 stand-in).

## Run it

```bash
npm install        # once, first time
npm run dev        # start the dev server
```

Open **http://localhost:3000** in your browser.

## Controls

| Key | Action |
|-----|--------|
| `W` / `S` | Accelerate forward / reverse |
| `A` / `D` | Steer left / right |
| `W + S` (held) | Boost (speed ramps beyond normal max) |
| `C` | Toggle camera (chase ↔ top-down) |
| `R` | Reset truck to start |

## MPU6050 sensor feed (virtual + live)

`lib/virtualSensor.ts` holds the roll/pitch/yaw/accelerometer state that drives the
camera. When a real MPU6050/ESP32 is attached over USB Serial, `lib/hardwareClient.ts`
feeds the same store live data — no camera changes needed.

## Project structure

```
app/
  layout.tsx          metadata + fonts + fullscreen shell
  page.tsx            dashboard shell + 3D canvas + overlays
  globals.css         design tokens + component primitives
components/
  Header.tsx          branding, status banner, control toolbar + hardware telemetry
  DashboardPanel.tsx  instrument cluster: drive, orientation, ADAS, trajectory
  Minimap.tsx         circular radar minimap overlay
  Scene.tsx           Canvas, fog, lights
  Dumper.tsx          truck body + 6 wheels (front pair steerable)
  Controls.tsx        physics: WASD throttle/steer/boost + all animations
  CameraRig.tsx       sensor-driven orbital camera + top-down + impact shake
  Terrain.tsx         minesite: road, rocks, cones, mounds
  Rain.tsx            dynamic rain particle system
  VolumetricFog.tsx   atmospheric fog layer
lib/
  constants.ts        ALL tuning values in one file
  keys.ts             keyboard state (WASD + edge keys C/R)
  virtualSensor.ts    MPU6050-shaped sensor store (hardware + virtual-pad sources)
  simStore.ts         truck pose + HUD display state
  rig.ts              shared refs of truck 3D parts (mutated by loop)
  hardwareClient.ts   Web Serial API reader for ESP32-C3 USB CDC stream
  mlClient.ts         ADAS WebSocket client + map-aware obstacle raycasts
  rig.ts              shared refs of truck 3D parts (mutated by loop)
```

## Tweaking (no web-dev knowledge needed)

Open `lib/constants.ts` — everything look/feel-related lives there:

- `PHYSICS` → max speed, boost speed, acceleration, steering rate, arena size
- `DUMPER.colors` → truck colour (`body`, `bin`, `tire`, …)
- `DUMPER.cabin / bin / chassis` → truck shape/size
- `SENSOR` → pad max tilt angles, pothole spike strength, smoothness
- `CAMERA` → chase distance/height, top-down height
- `SCENE` → ground/road/fog colours

Save and the dev server hot-reloads instantly.

## Checks

```bash
npm run lint    # eslint
npm run build   # type-check + production build
```