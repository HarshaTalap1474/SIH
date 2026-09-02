# ESP32-C3 Super Mini Firmware — Build & Flash Guide

Three sketches in this folder:

| File | Purpose |
|------|---------|
| `main/main.ino` | Production firmware — MPU6050 + 5 buttons + WebSocket broadcast @50Hz |
| `test_wiring/test_wiring.ino` | **Diagnostic** — verify every connection before flashing main.ino. DO THIS FIRST. |
| `serial_sscope/serial_sscope.ino` | Serial-only readout (no WiFi/WebSocket) — prints tilt direction + pressed button + `key:value` lines for the Arduino Serial Plotter / GY-SScope |

> Arduino requires each sketch in its own folder named after the sketch. Open `main/main.ino`, `test_wiring/test_wiring.ino`, or `serial_sscope/serial_sscope.ino` directly in the IDE.

---

## 1. Install Arduino IDE + ESP32-C3 Board Support

1. Install [Arduino IDE 2.x](https://www.arduino.cc/en/software)
2. **File → Preferences → Additional boards manager URLs**, add:
   ```
   https://espressif.github.io/arduino-esp32/package_esp32_index.json
   ```
3. **Tools → Board → Boards Manager**, search `esp32`, install **"esp32 by Espressif Systems"** (latest)
4. Select board: **Tools → Board → ESP32 Arduino → ESP32C3 Dev Module**
   (If your board's exact name isn't listed, pick `ESP32C3 Dev Module`)
5. Set **Tools → USB CDC On Boot → Enabled**
6. Set **Tools → Upload Speed → 115200**
7. Set **Tools → Flash Size → 4MB (2313/1600KB FS)** (Super Mini is 4MB)

---

## 2. Wiring (both sketches use the same pins)

### MPU6050 (I2C)
| MPU6050 | ESP32-C3 Super Mini |
|---------|---------------------|
| VCC     | 3V3 |
| GND     | GND |
| SDA     | GPIO7 |
| SCL     | GPIO6 |
| AD0     | **LEAVE UNCONNECTED (floating)** |

> **CRITICAL — AD0:** On tested hardware, wiring **AD0 to GND caused frozen / no-update IMU readings** (values stuck, never change when you move the board). **Leave AD0 unconnected (floating)** — that configuration reads correctly.

> **CRITICAL — Clone MPU6050 detected:** Your unit's **I2C scanner reports 0x68 but it actually streams data at 0x70**, and its WHO_AM_I chip ID does NOT match what the Adafruit library expects. The old Adafruit `begin()` therefore **rejected the chip and returned frozen/constant data** even though the scanner could see it. Both sketches now use a **manual register-based driver** (raw `Wire` reads) that **bypasses the Adafruit WHO_AM_I check** and works on real chips AND clones at any address (0x68 / 0x69 / 0x70 / 0x72). This fixes the frozen-reads bug. Do **NOT** use `Adafruit_MPU6050` for this chip.

### 5 Buttons (4-pin tactile, active-low with internal pullup)
Each button: **one leg → GPIO, diagonal-opposite leg → GND** (2 remaining legs unused).

| Button   | ESP32-C3 GPIO |
|----------|---------------|
| Throttle | GPIO1 |
| Brake    | GPIO3 |
| Steer L  | GPIO4 |
| Steer R  | GPIO5 |
| E-Stop   | GPIO10 |

> **4-pin button rule:** use ONE leg from each of the two internally-paired diagonals. Wire GPIO to one, GND to the diagonal-opposite leg. Press = connection made. Active-low → `digitalRead == LOW` means pressed.

---

## 3. Verify Wiring — Drive Sequence

1. Open `test_wiring/test_wiring.ino`
2. Set your Serial Monitor baud to **115200**
3. Select the correct **COM port**
4. **Upload.** If upload fails, see "Upload Troubleshooting" below.
5. Verify Serial output:
   - **I2C scan** lists a device at `0x68` / `0x69` / `0x70` / `0x72` and `mpuAddr` is set to it
   - **MPU6050 OK** appears (manual register init succeeded)
   - **Tilt the board** → pitch/roll change (board level = ~0/0, AccZ_g ~1.00)
   - **Press each button** → its column flips to `1`
6. If all good, your wiring is verified. Move to `main/main.ino`.

---

## 4. Configure & Flash Production Firmware

1. Open `main/main.ino`
2. At the top, set your WiFi credentials:
   ```cpp
   const char* WIFI_SSID     = "YOUR_WIFI_SSID";
   const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
   ```
3. Upload. When connected, Serial prints the IP:
   ```
   [WIFI] Connected. IP: 192.168.x.x
   ```
   > If STA can't connect, it auto-starts AP `ESP32-MINE-ADAS` at `192.168.4.1`.

4. **Calibration:** At boot, `main.ino` runs `calibrateGyro()` — **keep the board LEVEL & STILL for ~1 second** during startup (ignore earlier serial output until calibration completes).

5. Broadcast URL (browser/UI connects here):
   ```
   ws://<esp32-ip>:81/ws
   ```

---

## 5. Payload Format (what the UI receives)

```json
{
  "mpu": {
    "pitch": 12.3, "roll": -4.1, "yaw": 270.5,
    "ax": 0.02, "ay": -0.06, "az": 0.98,
    "anomaly": false
  },
  "btn": {
    "throttle": false, "brake": true,
    "left": false, "right": false, "estop": false
  }
}
```

---

## 6. Upload Troubleshooting (ESP32-C3 Super Mini)

These boards commonly refuse uploads. In order of likelihood:

1. **Hold BOOT during upload:** press-and-hold the **BOOT** button, click Upload, release after "Connecting..." appears.
2. **Manual download mode:** hold **BOOT**, press **RST**, release **RST**, then release **BOOT** — then upload.
3. **Use a different USB cable** — C3s are sensitive to poor/long type-C cables.
4. **Try a different COM port** — the C3 creates a serial port; if none appears, reinstall driver/check OS.
5. **USB CDC On Boot = Enabled** — required for native USB serial on many C3 boards.
6. If truly stuck, flash `test_wiring/test_wiring.ino` (blink-style) first, then main.ino.

---

## 7. Expected Power

- ESP32-C3 Super Mini powered via USB-C (5V). 
- MPU6050 powered from **3V3** pin (never 5V to logic).
- All GPIOs are **3.3V only** — never expose to 5V.

---

## 8. Libraries Required

Install via **Library Manager**:
- **Adafruit MPU6050**
- **Adafruit Unified Sensor**
- **WebSockets** by Markus Sattler
