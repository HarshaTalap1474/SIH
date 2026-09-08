# Components BOM — Recommended vs Alternative vs Cheap

## Compute Platform (Central)
**Assume Raspberry Pi 5 8GB as primary (or Pi 4 8GB if lab has it).**

| Priority | Component | Model | Price (₹) | Why / Function |
|----------|-----------|-------|-----------|----------------|
| ✅ Recommended | Raspberry Pi 5 (8GB) + SSD + PSU | RPi 5, 27W PSU | 8,000-10,000 | Runs YOLO + fusion + dashboard server. 8GB RAM for multiple CV streams |
| 🔄 Alternative | Raspberry Pi 4B (8GB) + USB3 SSD | RPi 4B | 5,000-6,000 | Slower (~2x) but sufficient for thermal YOLO + fusion at 10-15 FPS |
| 🆘 Cheap/Easy | Raspberry Pi 4B (4GB) or any Pi | RPi 4B 4GB | 4,000 | Min spec; must use lightweight models (YOLOv8n) + downscale frames |
| 💡 AI Accelerator (optional boost) | Google Coral USB / Hailo-8 | Coral (13 TOPS) / Hailo-8 (26 TOPS) | 6,000-8,000 | Gives Pi near-Jetson inference speed. Highly recommended buy |

---

## Thermal Camera (Core Sensor — Cuts Through Fog)

| Priority | Component | Model | Price (₹) | Function |
|----------|-----------|-------|-----------|----------|
| ✅ Recommended | Thermal Module | FLIR Lepton 3.5 (160×120) + breakout | 12,000-15,000 | Best student-grade thermal. Sees exhaust/engine/people through fog |
| 🔄 Alternative 1 | Thermal Array | MLX90640 (32×24) | 3,000-4,500 | Lower res but works. Detect heat blobs + position only |
| 🆘 Cheap/Easy 1 | Thermal Array | AMG8833 (8×8) | 1,500-2,500 | 64 pixels — detects "something hot" ahead, no shape |
| 🆘 Cheap/Easy 2 | IR Distance | IR thermopile MLX90614 | 800-1,200 | Single point temperature — presence detection in front cone |
| 💡 Lab Ask | Any FLIR / Seek / Hikmicro thermal | — | — | If lab has one, use it (even 80×60) |

---

## LiDAR (3D Obstacle Mapping)

| Priority | Component | Model | Price (₹) | Function |
|----------|-----------|-------|-----------|----------|
| ✅ Recommended | 2D LiDAR | RPLidar A1M8 / A2 | 8,000-12,000 | 360°, 12m. Point cloud → obstacle clusters + road edge |
| 🔄 Alternative | 2D LiDAR | YDLIDAR X4 / X2L | 5,000-7,000 | 10m range, cheaper, similar accuracy |
| 🆘 Cheap/Easy | Ultrasonic array | HC-SR04 ×4 (front bumper) | 150 each | Point distances at 4 angles. Poor man's LiDAR — enough to demo collision |
| 🆘 Cheap/Easy 2 | ToF sensor | VL53L0X / VL53L1X | 300-700 | Long-range single-point distance (4m / 4m) |
| 💡 Lab Ask | RPLidar A1/A3, YDLIDAR, velodyne clone | — | — | — |

> **Fallback strategy if no LiDAR:**
> Stereo depth with 2× Pi Cam v3 (₹1500+₹1500) + OpenCV SGBM → disparity → obstacle distance map. Shown in next section.

---

## mmWave Radar (Velocity + Range in Rain/Fog)

| Priority | Component | Model | Price (₹) | Function |
|----------|-----------|-------|-----------|----------|
| ✅ Recommended | 24GHz Radar | HLK-LD2450 | 1,500-2,500 | Multi-target X/Y tracking up to 6m, presence + speed |
| 🔄 Alternative | 24GHz Radar | LD2410 (human presence) | 900-1,500 | Detects movement + distance + speed. Simpler, less precise |
| 🆘 Cheap/Easy | PIR + Ultrasonic combo | HC-SR501 + HC-SR04 | 50 + 150 | PIR (motion) + ultrasonic (distance). Demos "radar-like" warning |
| 💡 Lab Ask | TI IWR6843, AWR1642, DFRobot sen0395 | — | — | IWR6843 = real automotive radar, complex driver needed |

---

## Stereo / RGB Cameras (Road Edge & Haul Road Guidance)

| Priority | Component | Model | Price (₹) | Function |
|----------|-----------|-------|-----------|----------|
| ✅ Recommended | 2× Pi Cam v3 | 12MP, wide FOV | 1,500 each | Stereo depth → road edge + lane guidance + object class (day) |
| 🔄 Alternative | USB webcams | Logitech C270 / 720p | 700-1,000 each | Works with Pi + OpenCV, lower quality |
| 🆘 Cheap/Easy | Any garage camera | FPV cam + capture card | 500 | Workable with jumpers |
| 💡 Lab Ask | Intel RealSense D435 / ZED / OAK-D | — | — | If available — replaces stereo pair + gives depth natively |

---

## V2V Communication (Cooperative Perception)

| Priority | Component | Model | Price (₹) | Function |
|----------|-----------|-------|-----------|----------|
| ✅ Recommended | LoRa Transceiver | SX1278/SX1262 module ×2 | 400-800 each | 1-2km LOS, mesh-capable. Broadcasts detections + positions |
| 🔄 Alternative | ESP-NOW (WiFi mesh) | ESP32 ×2 | 400 each | 50-150m line of sight. Simpler, higher BW, shorter range |
| 🆘 Cheap/Easy | NRF24L01+ | NRF24L01 + PA/LNA | 300-600 each | 100m-1km with PA. Simple, proven, cheap |
| 💡 Lab Ask | LoRa SX1262/RAK, XBee S2C, NRF24, ESP32 | — | — | — |

---

## Positioning (GPS/DGPS)

| Priority | Component | Model | Price (₹) | Function |
|----------|-----------|-------|-----------|----------|
| ✅ Recommended | RTK GNSS | u-blox F9P (ZED-F9P) + base station | 8,000-12,000 | cm-level. Haul-road accuracy, geo-fencing |
| 🔄 Alternative | High-sensitivity GPS | u-blox NEO-M8N / M9N | 1,500-2,500 | 2m accuracy. Good enough for fleet map |
| 🆘 Cheap/Easy | Basic GPS | NEO-6M | 500-800 | 3-5m accuracy. Shows vehicle on map (demo-suitable) |
| 💡 Lab Ask | NEO-M8N, BN-880 dual, RTK KIT | — | — | — |

---

## Display (In-Cabin Operator UI)

| Priority | Component | Model | Price (₹) | Function |
|----------|-----------|-------|-----------|----------|
| ✅ Recommended | 7" Touchscreen HDMI | 1024×600 capacitive | 2,500-3,500 | Operator view: thermal fusion + alerts + mini-map |
| 🔄 Alternative | Any 7-10" HDMI LCD | 800×480 | 1,500-2,000 | Works. Use keyboard/buttons instead of touch |
| 🆘 Cheap/Easy | Phone/Tablet + web UI | Any Android phone | 0 (own phone) | Serve dashboard over WiFi → phone screen. Frees up HDMI |
| 💡 Lab Ask | Any HDMI monitor / tablet | — | — | — |

---

## Alerting (Multi-Stage Safety)

| Priority | Component | Model | Price (₹) | Function |
|----------|-----------|-------|-----------|----------|
| ✅ Recommended | Buzzer + LEDs + Vibration motor | Active buzzer, red/yellow LEDs, 3V motor | 200 | Stage 1/2/3 alerts in-cabin |
| 🔄 Alternative | Speaker (USB/3.5mm) + relay brake-sim | USB speaker + 2ch relay | 500 | Voice warnings + simulated brake cut |
| 🆘 Cheap/Easy | Buzzer + LEDs only | — | 100 | Minimal audible+visual alert |
| 💡 Lab Ask | Relay module, speaker, siren, status light | — | — | — |

---

## Power System

| Priority | Component | Model | Price (₹) | Function |
|----------|-----------|-------|-----------|----------|
| ✅ Recommended | Power bank (20,000 mAh 20W PD) | Anker / Mi / generic | 2,000-3,000 | Powers Pi + sensors portable (demo) |
| 🔄 Alternative | 12V battery + buck converter | 12V 7Ah + XL4015/MP1584 | 1,500 | Vehicle-grade power, multiple 5V rails |
| 🆘 Cheap/Easy | Lab bench PSU / wall adapter | 5V 5A | 500 | Stationary demo only |
| 💡 Lab Ask | Any 12V battery + DC-DC | — | — | — |

---

## Enclosure & Mounting

| Priority | Component | Model | Price (₹) | Function |
|----------|-----------|-------|-----------|----------|
| ✅ Recommended | 3D-printed box + camera mounts | PLA/PETG | 500 (filament) | Professional look for demo, sensor alignment |
| 🔄 Alternative | Project box / acrylic case | Banggood generic | 300-600 | Protects electronics |
| 🆘 Cheap/Easy | Cardboard + tape + zip ties | — | 50 | Fine for internal round, ugly for final |
| 💡 Lab Ask | 3D printer, acrylic cutting, aluminum sheet | — | — | — |

---

## Fog Chamber (Test & Demo Tool — NOT on vehicle)

| Priority | Component | Model | Price (₹) | Function |
|----------|-----------|-------|-----------|----------|
| ✅ Recommended | Ultrasonic fogger (2-6 heads) + clear tub | 24000Hz foggers ×4 | 1,500-2,500 | Reproduces dense fog in 1m chamber for demo |
| 🔄 Alternative | Commercial fog machine | Halloween fog machine | 1,500-3,000 | Thick fog, needs power + smoke fluid |
| 🆘 Cheap/Easy | Incense sticks + fans | — | 100 | Light smoke, decent visual for camera demo |
| 💡 Lab Ask | Any ultrasonic humidifier | — | — | — |

> **Fog chamber demo = judge magnet.** Show thermal + LiDAR still detecting while camera sees nothing.

---

## Complete Build Summary

### Scenario A: Lab has the good stuff (Recommended)
| Item | Cost (₹) |
|------|----------|
| RPi 5 8GB (or lab) | 0-10,000 |
| FLIR Lepton / lab thermal | 0-15,000 |
| RPLidar / lab LiDAR | 0-12,000 |
| LD2450 radar | 0-2,500 |
| 2× Pi Cam v3 | 3,000 |
| LoRa SX1278 ×2 | 1,200 |
| GPS NEO-M8N / lab | 0-2,500 |
| 7" touchscreen | 0-3,500 |
| Buzzer/LED/relay | 300 |
| Power bank | 2,000 |
| Fog chamber | 2,000 |
| Enclosure | 500 |
| **Total** | **≈ ₹25,000-40,000** |

### Scenario B: Lab has nothing, buy smart (Alternative)
| Item | Cost (₹) |
|------|----------|
| RPi 4B 8GB | 6,000 |
| MLX90640 | 4,000 |
| YDLIDAR X4 (or skip→stereo) | 6,000 |
| LD2410 radar | 1,500 |
| Stereo webcams/Pi cams | 2,000 |
| ESP-NOW (ESP32 ×2) | 800 |
| NEO-6M GPS | 700 |
| 7" LCD | 2,000 |
| Misc | 1,000 |
| **Total** | **≈ ₹24,000-28,000** |

### Scenario C: Rock bottom (Cheap/Easy fallback — all ₹<5k each)
| Item | Cost (₹) |
|------|----------|
| Pi 4B 4GB (lab likely) | 0-5,000 |
| AMG8833 thermal (8×8) | 1,500 |
| HC-SR04 ×4 ultrasonic | 800 |
| 2× USB webcams | 1,500 |
| NRF24L01 ×2 | 600 |
| NEO-6M GPS | 700 |
| Buzzer + LEDs | 200 |
| Old phone as display (own) | 0 |
| **Total** | **≈ ₹5,000-10,000** |

---

## Sensor Fusion Strategy (short version)

```
Thermal (WHAT: is it a vehicle/person/hot blob)
   + LiDAR (WHERE + DISTANCE: exact 3D position, 360°)
   + Radar  (HOW FAST: closing velocity, works in rain)
   + Stereo (WHERE IS THE ROAD: edges, turning points)
   + GPS    (WHERE AM I: fleet + haul-road mapping)
        │
        ▼
   Kalman filter fusion on Pi 5 (or Pi 4)
   → one confidence-weighted object list
        │
        ▼
   Collision logic (TTC, safe-distance by zone)
   → 3-stage alerts + V2V broadcast + cloud dashboard
```

**Golden rule:** Never trust a single sensor. Thermal fails on a cold day, LiDAR fails in heavy rain, radar can't classify, camera can't see in fog. **Fuse all → robust system.** This sentence wins in front of judges.