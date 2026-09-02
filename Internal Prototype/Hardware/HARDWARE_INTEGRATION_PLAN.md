# V2 Hardware Integration Plan — ESP32-C3 Super Mini + MPU6050 + 5 Buttons

> **IMPORTANT:** This plan targets the **ESP32-C3 Super Mini** (confirmed hardware). The wiring below has been verified against the C3's strapping-pin restrictions. See the dedicated firmware folder (`firmware/`) for ready-to-flash sketches and a connection diagnostic.

## Overview

This document specifies the integration of real hardware into the existing SIH Internal Prototype:

- **ESP32-C3 Super Mini** — WiFi microcontroller acting as the bridge between the physical world and the browser-based 3D simulation.
- **MPU6050** — real 6-DOF IMU (accelerometer + gyroscope) replacing the virtual TiltPad.
- **5 physical buttons** — replacing/augmenting the keyboard (WASD) driving controls.

The hardware is a **dumb broadcaster**: it reads sensors/buttons and pushes JSON over WebSocket at ~50Hz. It does NOT run the simulation, physics, or ML model. All logic stays in the browser (Next.js UI) and the Python ML server.

---

## Architecture

```
  ESP32 Super Mini                    Browser (Next.js)
┌─────────────────────┐   WiFi     ┌──────────────────────────┐
│ MPU6050 (I2C) ────┐ │  ws://msg  │ hardwareClient.ts         │
│ 5x Buttons (GPIO) ├─┼─►─────────►│   │                      │
│ WiFi (STA/AP)     │ │            │   ├─► virtualSensor.ts   │
│ WebSocket server  │ │  ◄── ping ─┼───┘    (MPU data)        │
└─────────────────────┘            │   ├─► useHardwareStore   │
                                   │   │    (buttons/status)  │
                                   │   └─► CameraRig/Controls │
                                   └──────────────────────────┘
```

---

## ESP32 Firmware

> Ready-to-flash sketches live in `Internal Prototype/Hardware/firmware/`:
> - `main/main.ino` — production firmware (manual-register MPU + buttons + WebSocket broadcast @50Hz)
> - `test_wiring/test_wiring.ino` — diagnostic to verify all connections FIRST (see README)
> - `README.md` — build/flash/troubleshoot guide

### 1. Hardware Wiring (ESP32-C3 Super Mini — verified safe)

**Strapping-pin rule:** ESP32-C3 strapping pins are GPIO2, GPIO8, GPIO9. Pulling them to GND at boot can block flashing/booting. **The wiring below avoids all three.**

#### MPU6050 (I2C on boot-safe GPIO6/GPIO7)

| Component | ESP32-C3 Pin | Notes |
|-----------|--------------|-------|
| MPU6050 VCC | 3V3 | 3.3V logic only |
| MPU6050 GND | GND | |
| MPU6050 SCL | GPIO6 | I2C clock (`Wire.begin(7,6)`) |
| MPU6050 SDA | GPIO7 | I2C data |
| MPU6050 AD0 | **Leave unconnected (floating)** | Wiring to GND caused frozen IMU reads on tested hardware. |

> **HARDWARE FINDING — clone MPU6050:** The I2C scanner reports **0x68** but the chip actually **streams data at 0x70**, and its WHO_AM_I ID doesn't match what the Adafruit library expects. The Adafruit `begin()` **rejected the chip → constant/frozen readings** even though the scanner found it. **Fix applied:** both sketches now use a **manual register-based driver** (raw `Wire` register reads) that bypasses Adafruit's WHO_AM_I check and works at any address. **Do not use `Adafruit_MPU6050`.**

#### 5 Buttons (active-low, internal pullup)

| Button | ESP32-C3 GPIO | Notes |
|--------|---------------|-------|
| Throttle | GPIO1 | Active-low → GND |
| Brake | GPIO3 | Active-low → GND |
| Steer Left | GPIO4 | Active-low → GND |
| Steer Right | GPIO5 | Active-low → GND |
| E-Stop | GPIO10 | Active-low → GND |

> **All buttons:** one leg to GPIO, **diagonal-opposite leg to GND** (4-pin tactile: use one leg from each internally-paired diagonal). Use `pinMode(pin, INPUT_PULLUP)`. Pressed when `digitalRead() == LOW`.

> **Why these pins:** GPIO1/3/4/5/10 are general-purpose and NOT strapping pins. GPIO6/7 are chosen for I2C to avoid the GPIO8/9 strapping pins (a common boot/upload breaker on the C3). Avoid GPIO2/8/9 and GPIO20/21 (USB).

### 2. WiFi Mode

- **STA mode (default):** ESP32 joins the same network as the laptop running the UI.
- **AP fallback:** If no configured network found, ESP32 starts its own AP named `ESP32-MINE-ADAS` (`192.168.4.1`).

### 3. WebSocket Server

ESP32 runs a **WebSocket server using the `WebSocketsServer` library** on port `81`, path `/ws`.

- URL browser connects to: `ws://<esp32-ip>:81/ws`
- Broadcasts every connected client.
- Uses `WebSocketsServer` (Markus Sattler) — reliably supports the ESP32-C3, unlike `ESPAsyncWebServer` which has known C3 compatibility issues.

### 4. Firmware Loop (50 Hz)

```
loop:
  1. Read MPU6050 (accel + gyro)
  2. Fuse orientation via complementary filter  → pitch, roll, yaw
  3. Vibration check → anomaly flag
  4. Read all 5 buttons (debounced)
  5. Build JSON payload
  6. Broadcast over WebSocket
  ~ every 50ms
```

### 5. WebSocket Payload Format

```json
{
  "mpu": {
    "pitch": 12.3,
    "roll": -4.1,
    "yaw": 270.5,
    "ax": 0.02,
    "ay": -0.06,
    "az": 0.98,
    "anomaly": false
  },
  "btn": {
    "throttle": false,
    "brake": true,
    "left": false,
    "right": false,
    "estop": false
  }
}
```

### 6. Required Arduino Libraries

- `WiFi.h` (built-in)
- `Wire.h` (built-in, for I2C MPU6050)
- `Adafruit MPU6050` + `Adafruit Unified Sensor` (IMU driver)
- `WebSockets` by Markus Sattler (WebSocket server — C3-reliable)

---

## Calibration Strategy (keep it simple)

For camera-look-around you only need **gyro bias calibration** — not full 6-position accel calibration.

1. **At boot, keep the board LEVEL & STILL ~1 second.**
2. **`calibrateGyro(200)`**: average 200 gyro samples while stationary → store as `gxOffset/gyOffset/gzOffset`, subtract at runtime.
   - This is exactly what `MPU6050_tockn::calcGyroOffsets()` does (the "auto-calibrate" you heard about).
3. **Accelerometer:** use as-is for pitch/roll via gravity projection (`atan2`). Gravity always points down — accel is essentially self-calibrating for tilt. No 6-point accel calibration needed for ±1-2° camera tolerance.
4. **Complementary filter (alpha 0.98)** then stabilizes pitch/roll against gyro drift.

The UI's existing camera damping (`1 - exp(-lambda*dt)`) absorbs any residual ±1-2° offset, so the demo stays smooth.

**The real gotcha is axis MAPPING, not calibration.** If the board isn't mounted with axes aligned to the natural look frame, pitch/roll will drive the wrong camera axis. Verify/remap in firmware: mount so that "tilt right" = look right, "tilt forward" = look up, then flip signs in firmware if needed.

---

## MPU6050 Complementary Filter (firmware pseudo-code)

```
every 20ms:
  read accel (ax, ay, az) m/s^2
  read gyro (gx, gy, gz) rad/s, subtract gyro bias offsets
  accelPitch = atan2(-ax, sqrt(ay^2+az^2))
  accelRoll  = atan2(ay, az)
  pitch = alpha*(pitch + gy*dt) + (1-alpha)*accelPitch
  roll  = alpha*(roll  + gx*dt) + (1-alpha)*accelRoll
  yaw  += gz*dt   (relative; drifts without magnetometer)
  anomaly = sqrt(ax^2+ay^2+az^2)/9.81 > 1.6   (impact/vibration)
  where alpha = 0.98
```

> Yaw drift note: QMC5883L magnetometer is **not** in this integration (out of scope for the camera-look demo). Yaw will drift slowly — acceptable since it's used for relative look-around, not absolute heading.

---

## Button Semantics

| Button | Action | Behavior |
|--------|--------|----------|
| Throttle | Accelerate | Hold to accelerate (same as holding `W`) |
| Brake | Brake / Reverse | Hold to brake; if stopped, reverses (same as `S`) |
| Steer Left | Steer left | Hold to turn left (same as `A`) |
| Steer Right | Steer right | Hold to turn right (same as `D`) |
| E-Stop | Emergency stop | Toggle latches AEB immediately (hard-stop) |

---

## ESP32 File Structure (in `Internal Prototype/Hardware/`)

```
Hardware/
├── HARDWARE_INTEGRATION_PLAN.md   (this file)
├── firmware/
│   ├── main/main.ino              (production firmware — MPU + buttons + WebSocket @50Hz)
│   ├── test_wiring/test_wiring.ino (diagnostic — verify all connections FIRST)
│   └── README.md                  (build/flash/troubleshoot guide)
├── UI_CHANGES_REQUIRED.txt        (handoff to UI team)
└── ML_CHANGES_REQUIRED.txt        (handoff to ML team — no changes needed)
```

---

## Execution / Testing Steps

1. **Verify wiring first** — flash `test_wiring/test_wiring.ino`, confirm I2C sees MPU6050 and each button registers (see firmware README).
2. **Flash `main/main.ino`** — set your WiFi SSID/password, upload, confirm broadcast at `ws://<ip>:81/ws`.
3. **Standalone test** — open a plain HTML page, connect, confirm MPU + button JSON arrives at 50Hz.
4. **Wire into UI** — see `UI_CHANGES_REQUIRED.txt` for the 7 exact changes the UI team must make.
5. **Cockpit camera test** — tilt board, confirm camera look-around (pitch/roll → pan/up-down).
6. **Chase camera test** — tilt board, confirm orbit + height change.
7. **Button test** — confirm throttle/brake/steer/e-stop drive the truck.
8. **Fallback test** — power off ESP32, confirm graceful fallback to keyboard + virtual pad; power on, confirm auto-reconnect.
```
