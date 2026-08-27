\# MASTER SYSTEM SPECIFICATION v2.0 — SIH 2026 PROBLEM STATEMENT 26007

\*\*Project Title:\*\* Safe and Efficient Operation of Mine Vehicles in Fog and Low-Visibility Conditions  

\*\*Organization / Ministry:\*\* NMDC Limited / Ministry of Steel  

\*\*Team Name:\*\* Team WeBuildz  

\*\*Spec Version:\*\* 2.0 (Revised — All Critical Fixes Applied)  

\*\*Target Architecture:\*\* Fully Offline, Dual-Tier (ESP32-S3 + Raspberry Pi 4) Multi-Sensor RF Mesh with 2D Spatial Radar, AI Vision, and Layered Fail-Safe Degradation  



\---



\## 1. PROJECT CONTEXT \& PROBLEM DESCRIPTION



\### 1.1 Problem Statement Overview



NMDC Limited operates India's largest iron ore mining complexes in the Bailadila region (Chhattisgarh) and Donimalai (Karnataka). The Bailadila mines experience severe monsoon weather from \*\*June to October\*\*, bringing thick fog, dense cloud cover, and heavy rainfall that reduces visibility on unpaved haul roads to \*\*3–5 metres\*\*.



Heavy Earth Moving Machinery (HEMM) — specifically \*\*50 to 100-tonne haul dumpers\*\* — cannot operate safely under these conditions. Current mitigation forces supervisors to halt or slow down operations, creating:



\- Severe reduction in fleet productivity and ore evacuation

\- High production downtime costs (millions of INR per operational day)

\- Elevated collision risks with other dumpers, support vehicles, and road edges



```

╔══════════════════════════════════════════════════════════════════════════════╗

║                    PROBLEM IMPACT SUMMARY — BAILADILA MINES                 ║

╠══════════════════════════════════════════════════════════════════════════════╣

║  Monsoon Season   : June – October (5 months per year)                      ║

║  Visibility Drop  : 3 – 5 metres in dense fog conditions                    ║

║  Dumper Payload   : 50 – 100 tonnes per vehicle                             ║

║  Fleet Size       : Large mechanized fleet (15+ active dumpers per shift)   ║

║  Production Loss  : Operations halted / severely slowed during peak fog     ║

║  Existing Aids    : Insufficient — no intelligent V2V collision avoidance   ║

╚══════════════════════════════════════════════════════════════════════════════╝

```



\---



\### 1.2 Core Objectives



To develop a \*\*zero-cloud, 100% offline\*\* Vehicle-to-Vehicle (V2V) and Vehicle-to-Infrastructure (V2I) safety mesh that provides:



1\. \*\*In-Cabin Real-Time Guidance:\*\* High-contrast 2D top-down spatial radar — distraction-free, readable in a vibrating cab.

2\. \*\*Precision Collision Avoidance:\*\* Multi-layer distance awareness from 300m (ESP-NOW) down to 8m (ToF LiDAR) with sub-second alert response.

3\. \*\*Central Command Fleet Dashboard:\*\* Real-time tracking of all assets on an offline pre-cached GIS map with 3D spatial visualization — no cellular, no cloud required.



\---



\## 2. SYSTEM ARCHITECTURE \& COMMUNICATION FRAMEWORK



\### 2.1 The Three-Tier Safety Mesh



Communications are split across \*\*three distinct functional tiers\*\* — different frequency bands, different ranges, different purposes. No single point of failure can bring down the safety system.



```

┌─────────────────────────────────────────────────────────────────────────────┐

│                       THREE-TIER COMMUNICATION MESH                         │

├──────────┬──────────────────────┬──────────────────────┬────────────────────┤

│  Tier    │  Technology          │  Frequency / Band    │  Operational Range │

├──────────┼──────────────────────┼──────────────────────┼────────────────────┤

│  Tier 1  │  Sub-GHz LoRa Mesh  │  865–867 MHz         │  1 km – 5 km       │

│          │  (SX1276 / Ra-02)   │  (Unlicensed IN ISM) │  (Macro Fleet)     │

├──────────┼──────────────────────┼──────────────────────┼────────────────────┤

│  Tier 2  │  ESP-NOW V2V         │  2.4 GHz             │  100 m – 300 m     │

│          │  (Peer-to-Peer)      │  Protocol            │  (V2V Proximity)   │

├──────────┼──────────────────────┼──────────────────────┼────────────────────┤

│  Tier 3  │  Ultra-Wideband UWB  │  3.5 GHz – 6.5 GHz  │  10 m – 50 m       │

│          │  (Decawave DW3000)   │  Time-of-Flight ToF  │  (Hard-Stop Zone)  │

└──────────┴──────────────────────┴──────────────────────┴────────────────────┘

```



\*\*How each tier is used:\*\*



1\. \*\*Tier 1 — LoRa Telemetry (Macro):\*\* Every vehicle broadcasts a 20-byte binary packet every 3 seconds to hilltop base station gateways. The command center tracks all vehicles on an offline GIS map.



2\. \*\*Tier 2 — ESP-NOW V2V (Proximity):\*\* Activated when two vehicles enter 300m range. Vehicles directly exchange heading, speed, and status at \*\*10 Hz (100ms latency)\*\* without any router or access point. Binary packed struct — not JSON.



3\. \*\*Tier 3 — UWB Precision Ranging (Hard-Stop):\*\* Direct radio pulse Time-of-Flight ranging providing \*\*±10 cm distance measurement\*\* between approaching dumpers, completely independent of GPS. \*\*DW3000 only\*\* (DW1000 is discontinued — register maps are incompatible, not interchangeable).



\---



\### 2.2 System Fail-Safe State Matrix (Graceful Degradation)



```

╔═════════════════════════════════════════════════════════════════════════════════════════╗

║                              FAIL-SAFE DEGRADATION MATRIX                              ║

╠═══════════════════╦═════════════════════════════╦══════════════════════════╦═══════════╣

║  Fault State      ║  Trigger Condition           ║  Automated Mitigation    ║  UI Alert ║

╠═══════════════════╬═════════════════════════════╬══════════════════════════╬═══════════╣

║  NORMAL           ║  All sensors active;         ║  Full 2D radar, V2V      ║  GREEN:   ║

║  OPERATIONS       ║  GPS lock valid; RF healthy  ║  tracking, LoRa telemetry║  OPTIMAL  ║

╠═══════════════════╬═════════════════════════════╬══════════════════════════╬═══════════╣

║  GPS LOSS /       ║  Satellite count < 4 OR      ║  IMU Dead Reckoning:     ║  YELLOW:  ║

║  PIT SHADOW       ║  HDOP > 3.0                  ║  x(t) and y(t) both axes ║  GPS-IMU  ║

╠═══════════════════╬═════════════════════════════╬══════════════════════════╬═══════════╣

║  LoRa LINK        ║  Gateway ACK missed for      ║  Maintain local V2V mesh;║  ORANGE:  ║

║  FAILURE          ║  > 3 broadcast cycles        ║  queue logs to flash     ║  V2V ONLY ║

╠═══════════════════╬═════════════════════════════╬══════════════════════════╬═══════════╣

║  TOTAL RF         ║  No LoRa or ESP-NOW          ║  ToF LiDAR + Thermal;    ║  RED:     ║

║  JAMMING          ║  detected for > 10 seconds   ║  Recommend speed cap 10  ║  RF DOWN  ║

╠═══════════════════╬═════════════════════════════╬══════════════════════════╬═══════════╣

║  CRITICAL         ║  UWB distance < 20m OR       ║  Hardware buzzer + strobe║  CRITICAL:║

║  PERIMETER BREACH ║  LiDAR distance < 8m         ║  LED + siren fire        ║  BRAKE NOW║

╚═══════════════════╩═════════════════════════════╩══════════════════════════╩═══════════╝

```



> \*\*Key design principle:\*\* Each tier independently maintains safety. The outer tiers (LoRa, GPS) provide awareness and tracking. The inner tiers (ESP-NOW, UWB, ToF) provide collision prevention. A failure in an outer tier does NOT disable inner tiers.



\---



\## 3. MASTER SYSTEM BLOCK DIAGRAM



```

┌──────────────────────────────────────────────────────────────────────────────────────┐

│                            VEHICLE NODE (ONBOARD DUMPER)                             │

│                                                                                      │

│  ┌─────────────────────────────────┐           ┌─────────────────────────────────┐   │

│  │          SENSOR ARRAY           │           │     VISION \& THERMAL MODULE      │   │

│  │  • NEO-6M / NEO-M8N GPS (UART) │           │  • MLX90640  32x24 IR Thermal    │   │

│  │  • MPU6050  6-Axis IMU   (I2C) │           │    (thermal proximity detection)  │   │

│  │  • QMC5883L Magnetometer (I2C) │           │  • USB Dashcam (camera feed)      │   │

│  │  • TF-Luna  8m ToF Laser (UART)│           └──────────────┬──────────────────┘   │

│  └─────────────┬───────────────────┘                         │                      │

│                │  I2C / UART                                  │  SPI / USB           │

│                ▼                                              ▼                      │

│  ┌─────────────────────────────────────┐    ┌──────────────────────────────────┐    │

│  │        MCU TIER — ESP32-S3          │    │    SBC TIER — Raspberry Pi 4     │    │

│  │  • Dual-Core Xtensa LX7 @ 240MHz   │    │  • Quad-core Cortex-A72 @ 1.5GHz │    │

│  │  • 8MB PSRAM / 16MB Flash          │    │  • OpenCV Image De-Haze Pipeline │    │

│  │  • Sensor fusion (IMU+GPS+Mag)     │    │  • YOLOv8-Nano Object Detection  │    │

│  │  • Heading: QMC5883L + MPU6050    │    │  • Canvas 2D Radar UI (In-Cabin) │    │

│  │    complementary filter            │    │  • Node.js Serial Data Receiver  │    │

│  │  • ESP-NOW V2V Binary Mesh (Tier2) ├───►│  • Serves in-cabin HTML dashboard│    │

│  │  • DW3000 UWB Ranging (Tier 3)    │USB  └──────────────┬───────────────────┘    │

│  │  • SX1276 LoRa Telemetry (Tier 1) │10Hz               │                         │

│  │  • IMU Dead Reckoning (GPS backup) │                   ▼                         │

│  │  • Rollover Risk Classifier        │    ┌──────────────────────────────────┐    │

│  │  • Convoy Mode / Edge Detection    │    │   IN-CABIN DRIVER TOUCHSCREEN    │    │

│  │  • Fail-Safe State Machine         │    │  • 2D Top-Down Radar Display     │    │

│  └─────────────────────────────────────┘    │  • Color-coded proximity zones   │    │

│                                             │  • Fail-Safe status indicator    │    │

│                                             │  • Side clearance meter          │    │

│                                             └──────────────────────────────────┘    │

└──────────────────────────────┬───────────────────────────────────────────────────────┘

&#x20;                              │

&#x20;                   WIRELESS RF LINKS (NO ROUTER — PEER TO PEER)

&#x20;                              │

&#x20;          ┌───────────────────┼──────────────────────┐

&#x20;          │                   │                      │

&#x20;          ▼                   ▼                      ▼

&#x20; \[ESP-NOW 2.4GHz]     \[DW3000 UWB 6GHz]    \[SX1276 LoRa 865MHz]

&#x20; Vehicle-Vehicle       Vehicle-Vehicle       Vehicle to Gateway

&#x20; 300m / 10Hz           50m / pm10cm          5km / 3s beacon

&#x20;          │                   │                      │

&#x20;          └───────────────────┴──────────────────────┘

&#x20;                              │

&#x20;                              │  LoRa Sub-GHz Long Range Uplink

&#x20;                              ▼

┌──────────────────────────────────────────────────────────────────────────────────────┐

│                          OFFLINE COMMAND CENTER PLATFORM                             │

│                                                                                      │

│  ┌────────────────────────────┐   ┌────────────────────────────┐  ┌───────────────┐ │

│  │  HILLTOP BASE STATION GW  │   │  LOCAL SERVER (Laptop/PC)  │◄─┤ PYTHON FLEET  │ │

│  │  • ESP32-S3 Receiver Node  ├──►│  • Node.js Express Backend │  │ SIMULATOR     │ │

│  │  • SX1276 Antenna          │USB│  • Socket.io WebSocket     │  │ (15 Dumpers)  │ │

│  └────────────────────────────┘   │  • Telemetry State Machine │  │ • Fault inject│ │

│                                   └──────────────┬─────────────┘  └───────────────┘ │

│                                                  │                                   │

│                                                  ▼                                   │

│                                   ┌──────────────────────────────┐                  │

│                                   │   CONTROL ROOM DASHBOARD     │                  │

│                                   │  • React.js Single Page App  │                  │

│                                   │  • Leaflet.js Offline Tiles  │                  │

│                                   │  • Three.js 3D Fleet View    │                  │

│                                   │  • Live Telemetry Graphs     │                  │

│                                   │  • Fail-Safe Event Log       │                  │

│                                   └──────────────────────────────┘                  │

└──────────────────────────────────────────────────────────────────────────────────────┘

```



\---



\## 4. HARDWARE SPECIFICATIONS \& CIRCUIT WIRING



\### 4.1 Bill of Materials (BOM) per Vehicle Node



```

╔══════════════════════════════╦═════════════════════════════╦════════════════════════════════════╗

║  Component Name              ║  Exact Part / Model          ║  Primary Role \& Notes              ║

╠══════════════════════════════╬═════════════════════════════╬════════════════════════════════════╣

║  Primary MCU                 ║  ESP32-S3-WROOM-1 (32-pin)  ║  Sensor fusion, all RF protocols   ║

║                              ║  240MHz, 8MB PSRAM           ║                                    ║

╠══════════════════════════════╬═════════════════════════════╬════════════════════════════════════╣

║  SBC (Vision + Display)      ║  Raspberry Pi 4 Model B 4GB ║  YOLOv8 vision, in-cabin radar UI  ║

║                              ║  Cortex-A72 @ 1.5GHz        ║  Heatsink required (thermal mgmt)  ║

╠══════════════════════════════╬═════════════════════════════╬════════════════════════════════════╣

║  LoRa Module                 ║  SX1276 / Ra-02              ║  Tier 1 fleet telemetry (865MHz)   ║

╠══════════════════════════════╬═════════════════════════════╬════════════════════════════════════╣

║  UWB Ranging Chip            ║  Decawave DW3000 ONLY        ║  Tier 3 precision ranging ±10cm    ║

║                              ║  (DW1000 is EOL and uses a  ║  Enable NLOS detection in firmware  ║

║                              ║  different register map —    ║  DW1000 libraries will NOT work    ║

║                              ║  NOT interchangeable)        ║  with DW3000 hardware              ║

╠══════════════════════════════╬═════════════════════════════╬════════════════════════════════════╣

║  GPS Module                  ║  u-blox NEO-6M / NEO-M8N    ║  Macro GPS location tracking       ║

║                              ║  UART, 5Hz update rate       ║  GPS PPS used as master clock      ║

╠══════════════════════════════╬═════════════════════════════╬════════════════════════════════════╣

║  IMU Motion Sensor           ║  MPU6050                     ║  Roll, pitch, vibration energy,    ║

║                              ║  3-axis gyro + accel, I2C    ║  lateral acceleration detection    ║

╠══════════════════════════════╬═════════════════════════════╬════════════════════════════════════╣

║  Magnetometer \[NEW - CRITICAL]║  QMC5883L                  ║  Absolute compass heading (0-360°) ║

║                              ║  I2C addr 0x0D               ║  MPU6050 alone has NO compass.     ║

║                              ║  Same I2C bus as MPU6050     ║  Required for correct delta-theta  ║

║                              ║  \~Rs.60-80                   ║  spatial vector V2V math           ║

╠══════════════════════════════╬═════════════════════════════╬════════════════════════════════════╣

║  Front Obstacle Sensor       ║  TF-Luna (Benewake)          ║  Front obstacle detection (8m)     ║

║  \[Replaces VL53L0X]          ║  Laser ToF, UART, 0-8m       ║  At 20kmh: 8m = 1.44s warning     ║

║                              ║  250Hz update rate, \~Rs.400  ║  VL53L0X 2m range was too short    ║

║                              ║                              ║  for 50-tonne dumper braking dist. ║

╠══════════════════════════════╬═════════════════════════════╬════════════════════════════════════╣

║  Thermal Proximity Sensor    ║  MLX90640 32x24 IR Array     ║  Thermal PROXIMITY detection in    ║

║                              ║  I2C addr 0x33, 8Hz refresh  ║  fog. NOT thermal imaging — it     ║

║                              ║  -40 to 300°C range          ║  detects heat presence, not shapes ║

╠══════════════════════════════╬═════════════════════════════╬════════════════════════════════════╣

║  Vision Camera               ║  USB Dashcam (1080p/30FPS)   ║  YOLOv8 input, OpenCV de-haze feed ║

╠══════════════════════════════╬═════════════════════════════╬════════════════════════════════════╣

║  Power Regulation            ║  XL4016 DC-DC Buck           ║  24V vehicle → 12V @ 3A (Step 1)   ║

║                              ║  LM2596 DC-DC Buck           ║  12V → 5V @ 3A (Step 2)            ║

║                              ║  AMS1117-3.3 LDO             ║  5V → 3.3V for ESP32 + sensors     ║

╚══════════════════════════════╩═════════════════════════════╩════════════════════════════════════╝

```



\---



\### 4.2 Circuit Pinout Diagram \& Connections (ESP32-S3)



```

======================================================================================

ESP32-S3 PINOUT \& SENSOR INTERFACE MAPPING (v2.0 — CORRECTED)

======================================================================================



1\. MPU6050 (IMU) + QMC5883L (Magnetometer) + MLX90640 (Thermal)  \[I2C Bus 0]

&#x20;  • ESP32-S3 GPIO 8  (SDA) ────► MPU6050 SDA / QMC5883L SDA / MLX90640 SDA

&#x20;  • ESP32-S3 GPIO 9  (SCL) ────► MPU6050 SCL / QMC5883L SCL / MLX90640 SCL

&#x20;  • All VCC ────────────────────► 3.3V

&#x20;  • All GND ────────────────────► GND

&#x20;  I2C Addresses:

&#x20;    MPU6050   = 0x68

&#x20;    QMC5883L  = 0x0D

&#x20;    MLX90640  = 0x33

&#x20;  All unique — no address conflicts on shared bus.



2\. NEO-6M GPS Module  \[UART 1]

&#x20;  • ESP32-S3 GPIO 17 (TX1) ────► GPS RX

&#x20;  • ESP32-S3 GPIO 18 (RX1) ────► GPS TX

&#x20;  • VCC ────────────────────────► 3.3V (check module — some need 5V)

&#x20;  • GND ────────────────────────► GND



3\. TF-Luna ToF Sensor  \[UART 2]   (replaces VL53L0X from v1 spec)

&#x20;  • ESP32-S3 GPIO 19 (TX2) ────► TF-Luna RX

&#x20;  • ESP32-S3 GPIO 20 (RX2) ────► TF-Luna TX

&#x20;  • VCC ────────────────────────► 5V

&#x20;  • GND ────────────────────────► GND

&#x20;  Range: 0.2m – 8m  |  Update rate: 250Hz  |  Accuracy: ±6cm



4\. SX1276 LoRa Transceiver  \[SPI Bus 1]

&#x20;  • ESP32-S3 GPIO 12 (MOSI) ───► LoRa MOSI

&#x20;  • ESP32-S3 GPIO 13 (MISO) ───► LoRa MISO

&#x20;  • ESP32-S3 GPIO 11 (SCK)  ───► LoRa SCK

&#x20;  • ESP32-S3 GPIO 10 (CS)   ───► LoRa NSS

&#x20;  • ESP32-S3 GPIO 14 (RST)  ───► LoRa RESET

&#x20;  • ESP32-S3 GPIO 15 (DIO0) ───► LoRa DIO0 (TX/RX Done Interrupt)



5\. DW3000 UWB Module  \[SPI Bus 2]

&#x20;  • ESP32-S3 GPIO 35 (MOSI) ───► UWB MOSI

&#x20;  • ESP32-S3 GPIO 36 (MISO) ───► UWB MISO

&#x20;  • ESP32-S3 GPIO 37 (SCK)  ───► UWB SCK

&#x20;  • ESP32-S3 GPIO 34 (CS)   ───► UWB CS

&#x20;  • ESP32-S3 GPIO 38 (IRQ)  ───► UWB IRQ

&#x20;  FIRMWARE NOTE: Use Decawave DW3000 Arduino library.

&#x20;  DW1000 library is NOT compatible — different register addresses.



6\. Serial Telemetry to Raspberry Pi  \[USB-CDC]

&#x20;  • ESP32-S3 USB Type-C ───────► Raspberry Pi 4 USB Port (115200 Baud)

&#x20;  ESP32 sends 10Hz JSON telemetry to RPi4 via USB virtual COM port.



7\. Alarm Outputs

&#x20;  • ESP32-S3 GPIO 40 ──────────► Active Buzzer (NPN transistor driver)

&#x20;  • ESP32-S3 GPIO 41 ──────────► High-Intensity Strobe LED (MOSFET gate)

======================================================================================

```



\---



\### 4.3 Sensor Responsibility Map



```

┌──────────────────────────────────────────────────────────────────────────────┐

│                   SENSOR → FUNCTION RESPONSIBILITY MAP                       │

├─────────────────────────┬────────────────────────────────────────────────────┤

│  Sensor                 │  What It Provides                                  │

├─────────────────────────┼────────────────────────────────────────────────────┤

│  NEO-6M GPS             │  Absolute lat/lng when satellite lock > 4 sats     │

│  MPU6050                │  Roll, pitch, vibration energy, lateral accel      │

│  QMC5883L               │  Absolute compass heading 0-360° (drift-free)      │

│  Complementary Filter   │  Fused heading = 0.98\*gyro + 0.02\*magnetometer     │

│  TF-Luna (8m ToF)       │  Front obstacle distance — primary physical detect  │

│  MLX90640 (thermal)     │  Heat source presence (people/engines) in fog      │

│  ESP-NOW Mesh           │  Relative bearing + distance to networked vehicles  │

│  DW3000 UWB             │  Precise centimetre-level range (hard-stop zone)   │

│  SX1276 LoRa            │  Fleet GPS position broadcast to command center     │

└─────────────────────────┴────────────────────────────────────────────────────┘

```



\---



\## 5. ARTIFICIAL INTELLIGENCE \& MACHINE LEARNING PIPELINE



\### 5.1 Model 1 — Edge Vision Engine (YOLOv8-Nano)



\- \*\*Objective:\*\* Detect non-networked hazards (boulders, unequipped light vehicles, human workers) in de-hazed camera feed.

\- \*\*Architecture:\*\* YOLOv8n (Nano), quantized to INT8 format via \*\*ONNX Runtime\*\* (not TensorRT — TensorRT is NVIDIA GPU only, not available on RPi4 ARM CPU).

\- \*\*Realistic FPS Target:\*\* \*\*8–12 FPS\*\* on RPi4 under combined load. De-haze pipeline adds \~30ms per frame. At 10 km/h and 10 FPS, 0.28m vehicle travel per frame — within safe detection margins.

\- \*\*Dataset:\*\* Fine-tuned on 5,000 custom-annotated images:

&#x20; - Heavy mining machinery silhouettes (dumpers, excavators, loaders)

&#x20; - Thermal IR heat signature overlays of human workers in fog

&#x20; - Rockfall obstacles and loose gravel on dirt road surfaces



```

OpenCV De-Haze Pipeline (Dark Channel Prior Algorithm):

────────────────────────────────────────────────────────

Raw Frame (USB Cam)

&#x20;   → Dark Channel Prior estimation

&#x20;   → Atmospheric Light estimation

&#x20;   → Transmission Map recovery

&#x20;   → Radiance / enhanced frame output

&#x20;   → YOLOv8n inference (ONNX Runtime INT8)

&#x20;   → Bounding boxes + class labels

&#x20;   → Alert layer overlay

&#x20;   → Render to in-cabin HTML Canvas radar

```



\---



\### 5.2 Model 2 — Rollover Risk Classifier (Random Forest)



> \*\*Scope reduced from v1:\*\* Rollover + tilt risk detection ONLY.  

> Driver fatigue and road washout prediction require biometric and historical map data not available at prototype stage. Listed as Phase 2 extensions.



\- \*\*Input Features:\*\* `\[roll\_angle, pitch\_angle, lateral\_accel\_ay, vibration\_energy, speed\_kmh]`

\- \*\*Output Classes:\*\* `SAFE` / `CAUTION` / `ROLLOVER\_RISK`

\- \*\*Training:\*\* Scikit-learn Random Forest in Python. Exported via `m2cgen` to generated C code that runs on ESP32 — no Python dependency on the MCU.



```python

import numpy as np



def extract\_features(imu\_buffer, speed\_kmh):

&#x20;   """

&#x20;   imu\_buffer shape: (50, 6) — 50 samples of \[ax, ay, az, gx, gy, gz]

&#x20;   Returns feature vector for Random Forest classifier

&#x20;   """

&#x20;   ax, ay, az, gx, gy, gz = np.mean(imu\_buffer, axis=0)



&#x20;   # Tilt angles from accelerometer (accurate during slow motion)

&#x20;   roll\_angle  = np.arctan2(ay, az) \* (180.0 / np.pi)

&#x20;   pitch\_angle = np.arctan2(-ax, np.sqrt(ay\*\*2 + az\*\*2)) \* (180.0 / np.pi)



&#x20;   # Road roughness proxy — vertical acceleration variance over window

&#x20;   vibration\_energy = np.var(imu\_buffer\[:, 2])



&#x20;   return \[roll\_angle, pitch\_angle, ay, vibration\_energy, speed\_kmh]





def classify\_rollover\_risk(features):

&#x20;   """

&#x20;   Threshold baseline — replace with m2cgen exported RF for demo

&#x20;   """

&#x20;   roll, pitch, lat\_accel, vibe, speed = features

&#x20;   if abs(roll) > 25 or abs(pitch) > 20:   return "ROLLOVER\_RISK"

&#x20;   if abs(roll) > 15 or abs(pitch) > 12:   return "CAUTION"

&#x20;   return "SAFE"

```



\*\*Demo tip:\*\* Tilt hardware prototype board to 15°, 25° by hand. Watch in-cabin UI transition SAFE → CAUTION → ROLLOVER\_RISK in real time. No test vehicle needed.



\---



\### 5.3 Road Edge Drift Detection (Rule-Based — No ML)



Detects a loaded dumper drifting laterally toward a fog-covered road edge. Uses MPU6050 alone — no extra hardware:



```

Rule:

&#x20; IF  |lateral\_acceleration\_ay| > 0.15g

&#x20; AND sustained for > 2.0 seconds:

&#x20;     → flag "ROAD EDGE DRIFT — CHECK HEADING"

&#x20;     → log event to telemetry flash storage

&#x20;     → include in next LoRa packet to command center

```



\---



\### 5.4 Convoy Mode Logic (Differentiator Feature)



When two networked dumpers travel the same direction on the same road, switch from collision warning to follow-distance mode:



```

Heading difference:   delta\_theta = abs(heading\_A - heading\_B)



IF  delta\_theta < 30°  AND  rel\_dist < 80m:

&#x20;   → MODE: CONVOY  (maintain 25m gap — no collision alarm)



IF  delta\_theta > 120°  AND  rel\_dist < 200m:

&#x20;   → MODE: HEAD-ON APPROACH  (full collision alert active)



ELSE:

&#x20;   → MODE: STANDARD PROXIMITY  (distance monitoring)

```



No extra hardware required — pure heading comparison logic in ESP32 firmware.



\---



\## 6. SPATIAL MATH \& IN-CABIN VISUALIZATION



\### 6.1 Heading Fusion — Complementary Filter



\*\*Why this is required:\*\*  

MPU6050 gyro integration drifts \~0.1°/second. After 60 seconds of GPS loss, heading error is ±6°. After 5 minutes it's ±30°. The QMC5883L gives absolute heading but is noisy. Fuse them:



```

theta\_fused(t) = alpha \* \[theta\_fused(t-1) + gyro\_z \* dt]

&#x20;             + (1 - alpha) \* theta\_magnetometer



Where alpha = 0.98

(Trust gyro 98% for short-term stability, magnetometer 2% for long-term drift correction)

```



Zero library dependencies. Runs on ESP32 in microseconds.



\---



\### 6.2 Dead Reckoning — GPS Fallback (Both Axes)



When GPS satellite count < 4 or HDOP > 3.0:



$$x\_t = x\_{t-1} + v \\cdot \\Delta t \\cdot \\cos\\theta$$

$$y\_t = y\_{t-1} + v \\cdot \\Delta t \\cdot \\sin\\theta$$



Where:

\- $v$ = speed in m/s (from GPS last known value)

\- $\\theta$ = fused heading from QMC5883L complementary filter

\- $\\Delta t$ = time step in seconds



> \*\*Important:\*\* Dead reckoning accumulates \~30m error per 5 minutes. The command center map MUST show \*\*"DR MODE — POSITION ESTIMATED"\*\* warning badge. Do NOT display estimated position as GPS-accurate. V2V collision avoidance is unaffected (it is range-based, not GPS-based).



\---



\### 6.3 V2V Spatial Position Formula



To place approaching Dumper B on Dumper A's 2D radar at the correct relative position:



Given:

\- $R$ = UWB Time-of-Flight range measurement (metres)

\- $\\theta\_A$ = Dumper A's fused heading (QMC5883L + MPU6050)

\- $\\theta\_B$ = Dumper B's heading (received in ESP-NOW V2V packet)

\- $\\Delta\\theta = \\theta\_B - \\theta\_A$



Cartesian offset from Dumper A's centre (Dumper A = radar origin):



$$X\_{radar} = R \\cdot \\sin(\\Delta\\theta)$$

$$Y\_{radar} = R \\cdot \\cos(\\Delta\\theta)$$



\---



\### 6.4 In-Cabin Display — HTML5 Canvas 2D Radar



> \*\*Architecture decision from v1:\*\* Three.js in-cabin display dropped. RPi4 cannot comfortably run YOLOv8n + OpenCV de-haze + Three.js simultaneously. Canvas 2D is faster, lighter, and actually easier for a driver to read in a vibrating cab. Three.js moves to command center (laptop) where there is no compute constraint.



```

┌─────────────────────────────────────────────────────────────────────────────┐

│                    IN-CABIN RADAR DISPLAY LAYOUT                            │

│                                                                             │

│  ┌───────────────────────────────────────────────────────────────────────┐  │

│  │  STATUS: ██ SYSTEM OPTIMAL                   VEHICLE: DUMP-101       │  │

│  ├───────────────────────────────────────────────────────────────────────┤  │

│  │                                                                       │  │

│  │            .  .  .  .   300m   .  .  .  .                           │  │

│  │         .                                  .                         │  │

│  │       .             \[DUMP-103]               .                       │  │

│  │      .            UP 87m HEAD-ON              .   150m               │  │

│  │     .                                          .                     │  │

│  │    .                   \[YOU]                    .                    │  │

│  │    .                    /\\                      .   50m              │  │

│  │     .            \[DUMP-102]                    .                     │  │

│  │      .           45m PASSING                  .                      │  │

│  │        .                                     .                       │  │

│  │          .              .  .  .  .          .                        │  │

│  │                                                                       │  │

│  ├───────────────────────────────────────────────────────────────────────┤  │

│  │  SIDE:  <- 2.1m  |  3.4m ->    SPEED: 14 km/h    ROLL: 3.2 deg     │  │

│  └───────────────────────────────────────────────────────────────────────┘  │

│                                                                             │

│   Color Coding:  BLUE dot = >80m   YELLOW = 20-80m   RED = <20m (alarm)   │

└─────────────────────────────────────────────────────────────────────────────┘

```



```javascript

// Canvas 2D Radar — runs on RPi4, served via localhost to touchscreen

function drawRadar(ctx, W, H, vehicles) {

&#x20; const cx = W / 2, cy = H / 2;

&#x20; const maxRange = 300; // metres

&#x20; const scale = (H / 2) / maxRange;



&#x20; ctx.clearRect(0, 0, W, H);

&#x20; ctx.fillStyle = "#0a0f1a";

&#x20; ctx.fillRect(0, 0, W, H);



&#x20; // Range rings at 50m, 150m, 300m

&#x20; \[50, 150, 300].forEach(r => {

&#x20;   ctx.beginPath();

&#x20;   ctx.arc(cx, cy, r \* scale, 0, 2 \* Math.PI);

&#x20;   ctx.strokeStyle = "rgba(0,200,100,0.15)";

&#x20;   ctx.lineWidth = 1;

&#x20;   ctx.stroke();

&#x20;   ctx.fillStyle = "rgba(0,200,100,0.4)";

&#x20;   ctx.font = "10px monospace";

&#x20;   ctx.fillText(`${r}m`, cx + r \* scale + 3, cy);

&#x20; });



&#x20; // Self vehicle (always at centre)

&#x20; ctx.fillStyle = "#00ff88";

&#x20; ctx.fillRect(cx - 8, cy - 14, 16, 28);



&#x20; // Nearby vehicles from V2V / UWB data

&#x20; vehicles.forEach(v => {

&#x20;   const rad = (v.relAngleDeg \* Math.PI) / 180;

&#x20;   const px  = cx + v.distM \* scale \* Math.sin(rad);

&#x20;   const py  = cy - v.distM \* scale \* Math.cos(rad);

&#x20;   const col = v.distM < 20 ? "#ff2244"

&#x20;             : v.distM < 80 ? "#ffaa00"

&#x20;             :                "#4488ff";



&#x20;   ctx.fillStyle = col;

&#x20;   ctx.fillRect(px - 8, py - 14, 16, 28);

&#x20;   ctx.fillStyle = "#ffffff";

&#x20;   ctx.font = "10px monospace";

&#x20;   ctx.fillText(`${v.id}  ${Math.round(v.distM)}m`, px + 12, py);

&#x20; });

}

```



\---



\### 6.5 Command Center — Three.js 3D Fleet View



Three.js runs on the \*\*command center laptop/PC\*\* — no compute constraints here.



```javascript

// React-Three-Fiber 3D vehicle mesh for command center

import { Canvas } from '@react-three/fiber';

import { Text } from '@react-three/drei';

import { useRef } from 'react';



function DumperMesh({ position, color, vehicleId, speed }) {

&#x20; const mesh = useRef();

&#x20; return (

&#x20;   <group position={position}>

&#x20;     <mesh ref={mesh}>

&#x20;       <boxGeometry args={\[3, 2, 6]} />      {/\* Low-poly dumper box \*/}

&#x20;       <meshStandardMaterial color={color} />

&#x20;     </mesh>

&#x20;     <Text position={\[0, 2, 0]} fontSize={0.8} color="white">

&#x20;       {vehicleId} · {speed} km/h

&#x20;     </Text>

&#x20;   </group>

&#x20; );

}

```



\---



\## 7. COMMUNICATION PROTOCOLS \& DATA PAYLOAD STRUCTURES



\### 7.1 Tier 1 — LoRa Telemetry Payload (20 Bytes Binary)



```cpp

// C-Struct for LoRa Transmission — packed to 20 bytes exactly

// FIX v2.0: uint35\_t corrected to uint32\_t (uint35\_t does not exist in C)



struct \_\_attribute\_\_((\_\_packed\_\_)) DumperTelemetry {

&#x20;   uint16\_t vehicle\_id;    // 2 Bytes : Unique Vehicle ID  e.g. 1001

&#x20;   int32\_t  latitude;      // 4 Bytes : Encoded Lat  (Lat  \* 1e7, integer)

&#x20;   int32\_t  longitude;     // 4 Bytes : Encoded Long (Long \* 1e7, integer)

&#x20;   uint8\_t  speed\_kmh;     // 1 Byte  : Speed 0-255 km/h

&#x20;   uint16\_t heading\_deg;   // 2 Bytes : Heading 0-3600 (0.1 degree resolution)

&#x20;   int8\_t   pitch\_deg;     // 1 Byte  : Pitch -128 to +127 degrees

&#x20;   int8\_t   roll\_deg;      // 1 Byte  : Roll  -128 to +127 degrees

&#x20;   uint8\_t  status\_flags;  // 1 Byte  : Bitfield flags

&#x20;                           //   bit 0 = GPS lock valid

&#x20;                           //   bit 1 = Alarm state active

&#x20;                           //   bit 2 = Dead reckoning mode active

&#x20;                           //   bit 3 = Rollover risk detected

&#x20;                           //   bit 4 = Clock drift warning

&#x20;   uint32\_t timestamp;     // 4 Bytes : GPS epoch seconds (FIXED from uint35\_t)

};                          // TOTAL   : 20 Bytes

```



\*\*Time sync:\*\* GPS PPS signal used as master clock when GPS active. When dead reckoning, bit 4 of `status\_flags` is set to warn the command center that the timestamp may have drifted.



\---



\### 7.2 Tier 2 — ESP-NOW V2V Binary Struct



> \*\*FIX v2.0:\*\* ESP-NOW transmits raw byte arrays — NOT JSON strings. The JSON below is the logical representation only. On-wire format is the packed C struct.



```cpp

// Binary packed struct for ESP-NOW V2V — 12 bytes

// ESP-NOW max payload = 250 bytes (well within budget)



struct \_\_attribute\_\_((\_\_packed\_\_)) V2VPacket {

&#x20;   uint16\_t sender\_id;       // 2 bytes : Source vehicle ID

&#x20;   uint16\_t target\_id;       // 2 bytes : 0xFFFF = broadcast to all

&#x20;   uint16\_t rel\_dist\_cm;     // 2 bytes : UWB range in cm (0 = 0m, 5000 = 50m)

&#x20;   int16\_t  rel\_angle\_deg10; // 2 bytes : Relative angle \* 10 (0.1° resolution)

&#x20;   uint8\_t  speed\_kmh;       // 1 byte  : Speed

&#x20;   uint8\_t  alarm\_level;     // 1 byte  : 0=Safe  1=Caution  2=Critical

};                            // TOTAL   : 12 bytes



// ESP-NOW Send:

V2VPacket pkt;

pkt.sender\_id    = MY\_VEHICLE\_ID;

pkt.target\_id    = 0xFFFF;        // broadcast

pkt.rel\_dist\_cm  = (uint16\_t)(uwb\_dist\_m \* 100.0f);

pkt.alarm\_level  = get\_alarm\_level(uwb\_dist\_m);

esp\_now\_send(broadcast\_mac, (uint8\_t\*)\&pkt, sizeof(V2VPacket));



// ESP-NOW Receive callback:

void on\_recv(const uint8\_t \*mac, const uint8\_t \*data, int len) {

&#x20;   V2VPacket rx;

&#x20;   memcpy(\&rx, data, sizeof(V2VPacket));

&#x20;   float dist\_m = rx.rel\_dist\_cm / 100.0f;

&#x20;   // Update radar display with rx.sender\_id at dist\_m

}

```



\*\*Logical representation (for documentation / dashboard display only):\*\*

```json

{

&#x20; "sender\_id": "DUMP-101",

&#x20; "target\_id": "BROADCAST",

&#x20; "rel\_dist\_m": 18.4,

&#x20; "rel\_angle\_deg": 35.2,

&#x20; "speed\_kmh": 14,

&#x20; "alarm\_level": 2

}

```



\---



\## 8. POWER ARCHITECTURE



> \*\*\[NEW SECTION — v1 had no power design. Jury will ask about this.]\*\*



\### 8.1 Mine Dumper Electrical Environment



```

┌────────────────────────────────────────────────────────────────────┐

│               MINE DUMPER ELECTRICAL SYSTEM REALITY                │

├────────────────────────────────────────────────────────────────────┤

│  Nominal Supply Voltage  :  24V DC vehicle system                  │

│  Voltage at Engine Idle  :  22V (alternator undercharging)         │

│  Voltage at Full Charge  :  28V – 29V (normal alternator output)  │

│  Load Dump Spike (fault) :  Up to 36V (sudden engine cut-off)     │

│                                                                    │

│  WARNING: Plugging RPi4 directly into this WILL destroy it.       │

│  The 5V USB input on RPi4 tolerates maximum 5.25V. A 24V spike   │

│  with no regulation will fry the board instantly.                 │

└────────────────────────────────────────────────────────────────────┘

```



\### 8.2 Peak Power Budget



```

╔════════════════════════════════════════╦═══════╦═══════════╦══════════╗

║  Component                             ║  Volt ║  Current  ║  Power   ║

╠════════════════════════════════════════╬═══════╬═══════════╬══════════╣

║  Raspberry Pi 4 (YOLOv8 full load)    ║  5V   ║  2.5–3.5A ║  \~17.5W  ║

║  ESP32-S3 (WiFi + SPI active)         ║  3.3V ║  300mA    ║  \~1.0W   ║

║  SX1276 LoRa (TX peak)                ║  3.3V ║  120mA    ║  \~0.4W   ║

║  DW3000 UWB                           ║  3.3V ║  80mA     ║  \~0.3W   ║

║  MLX90640 Thermal                     ║  3.3V ║  23mA     ║  \~0.1W   ║

║  QMC5883L + MPU6050                   ║  3.3V ║  5mA      ║  negligible║

║  NEO-6M GPS                           ║  3.3V ║  25mA     ║  \~0.1W   ║

║  TF-Luna ToF                          ║  5V   ║  120mA    ║  \~0.6W   ║

║  USB Dashcam                          ║  5V   ║  500mA    ║  \~2.5W   ║

║  Buzzer + LED Strobe (peak)           ║  5V   ║  200mA    ║  \~1.0W   ║

╠════════════════════════════════════════╬═══════╬═══════════╬══════════╣

║  TOTAL PEAK DRAW                      ║       ║           ║  \~23.5W  ║

╚════════════════════════════════════════╩═══════╩═══════════╩══════════╝

```



\---



\### 8.3 Power Solutions — Three Options by Budget



\#### Option A — Proper Vehicle Integration  (College funded — production design)



```

24V Vehicle Supply

&#x20;       │

&#x20;       ▼

\[ TVS Diode P6KE30A ]               ← Clamps load-dump spikes to 30V max

&#x20;       │

&#x20;       ▼

\[ XL4016 DC-DC Buck:  24V → 12V @ 3A ]    (\~Rs.120)

&#x20;       │

&#x20;       ▼

\[ LM2596 DC-DC Buck:  12V → 5V  @ 3A ]    (\~Rs.80)

&#x20;       │

&#x20;  ┌────┴──────────────────────┐

&#x20;  │                           │

\[ RPi4 via USB-C 5V/3A ]   \[ AMS1117-3.3 LDO ]   (\~Rs.15)

&#x20;                               │

&#x20;                \[ ESP32-S3 + all 3.3V sensors ]



\+ Add 1000uF / 10V electrolytic capacitor across 5V rail

&#x20; to absorb transient spikes from alternator switching.



Total power circuit cost: \~Rs.300 — extremely cheap for what it does.

```



\---



\#### Option B — USB Power Bank  ⭐ RECOMMENDED FOR SIH DEMO



```

20,000 mAh USB Power Bank  (5V / 3A output)

&#x20;       │

&#x20;  ┌────┴─────────────────────────────────┐

&#x20;  │                                      │

\[ RPi4 via USB-C  5V/3A ]    \[ ESP32-S3 via USB — AMS1117 onboard ]



WHY THIS IS THE SMART CHOICE FOR SIH:

&#x20; • Zero extra cost if any team member owns one

&#x20; • Acts as a perfect UPS — absorbs any vehicle voltage spike

&#x20; • Completely portable — demo anywhere without a real dumper

&#x20; • No power circuit to debug on presentation day

&#x20; • Runtime at 23W peak load: 3.5 – 4 hours

&#x20; • SIH demo sessions are typically 30-45 minutes

```



\---



\#### Option C — No RPi4, Battery Only  (absolute zero budget fallback)



```

1x 18650 Li-Ion Cell  (3.7V / 2600mAh typical)

&#x20;       │

\[ TP4056 Charging Module ]    (\~Rs.30)

&#x20;       │

\[ MT3608 Boost: 3.7V → 5V ]  (\~Rs.25)

&#x20;       │

\[ ESP32-S3 ]  ← Hosts lightweight web dashboard via built-in WiFi AP



What you lose:  RPi4, YOLOv8 vision, Canvas radar, thermal camera

What you keep:  All 3 RF tiers, fleet telemetry, fail-safe matrix,

&#x20;               command center dashboard on laptop via WiFi AP



Runtime: \~3 hours at 300mA ESP32 draw.

```



\---



\### 8.4 Thermal Management (Overpower / Throttling)



```

Problem:

&#x20; RPi4 under sustained 100% CPU (YOLOv8 inference) reaches 80°C

&#x20; → throttles to \~600MHz (from 1.5GHz)

&#x20; → effective compute halved

&#x20; → FPS drops, system latency spikes



Fix:

&#x20; 1. Heatsink on RPi4 CPU + RAM chip

&#x20;    (included in most RPi4 starter kits, \~Rs.50 standalone)



&#x20; 2. Small 40mm 5V fan on enclosure wall, GPIO-controlled:

&#x20;      if cpu\_temp\_celsius > 70:  fan\_gpio.on()

&#x20;      if cpu\_temp\_celsius < 60:  fan\_gpio.off()



&#x20; 3. Use 64-bit Raspberry Pi OS (armv8)

&#x20;    Better ONNX Runtime optimization than 32-bit OS.

```



\---



\## 9. OFFLINE MAP PRE-CACHING \& GIS SETUP



\### 9.1 Pre-Caching Offline Map Tiles



Because mining pits have zero internet connectivity, map tiles must be stored locally before site deployment:



1\. \*\*Extraction:\*\* Use \*\*QGIS\*\* or \*\*MOBAC (Mobile Atlas Creator)\*\* to select the bounding box of the mining area (Kirandul/Bacheli: \~18.63°N, 81.25°E).

2\. \*\*Export Format:\*\* Standard OSM tile directory `/{z}/{x}/{y}.png` for zoom levels 12–18.

3\. \*\*Served locally\*\* by the Node.js Express backend.



```javascript

// React Leaflet Offline Configuration

import { MapContainer, TileLayer } from 'react-leaflet';



const OfflineMap = () => (

&#x20; <MapContainer center={\[18.635, 81.254]} zoom={15} style={{ height: "100vh" }}>

&#x20;   <TileLayer

&#x20;     url="http://localhost:5000/mine\_tiles/{z}/{x}/{y}.png"

&#x20;     maxZoom={18}

&#x20;     minZoom={12}

&#x20;     attribution="NMDC Offline GIS Data"

&#x20;   />

&#x20; </MapContainer>

);

```



\---



\## 10. PYTHON FLEET SIMULATOR SPECIFICATION



> \*\*\[NEW SECTION — v1 had no simulator spec. This is the SIH demo backbone.]\*\*



\### 10.1 Architecture



```

┌───────────────────────────────────────────────────────────────────────────┐

│                       PYTHON FLEET SIMULATOR (Adi)                        │

│                                                                           │

│  • 15 virtual DumperSimNode objects — each holds position, heading,       │

│    speed, fault state                                                     │

│  • Advances position every 3 seconds (matches real LoRa beacon rate)     │

│  • Emits DumperTelemetry-compatible JSON over WebSocket to Node.js        │

│  • Supports CLI fault injection commands for live demo day                │

│  • Small random heading jitter simulates real road-following behaviour    │

└───────────────────────────────────────────────────────────────────────────┘

```



\### 10.2 Fault Injection CLI — Demo Day Commands



```bash

\# Each command triggers the matching row in the fail-safe matrix

\# Dashboard updates in real time — perfect for live demo



python simulator.py --fault gps\_dropout DUMP-101

\# DUMP-101 loses GPS → Yellow "GPS-IMU" badge on dashboard map

\# Command center shows dead reckoning position with "DR" indicator



python simulator.py --fault rf\_loss DUMP-103

\# DUMP-103 stops transmitting → "VEHICLE OFFLINE" after 3 missed beacons

\# Tests LoRa failure row in degradation matrix



python simulator.py --fault uwb\_breach DUMP-101 DUMP-102

\# Simulates two dumpers inside 20m UWB perimeter

\# Fires RED "COLLISION IMMINENT — BRAKE NOW"

\# Dashboard shows buzzer + strobe event



python simulator.py --fault rollover DUMP-105

\# DUMP-105 roll\_angle > 25° → ROLLOVER\_RISK classification triggers

\# Dashboard shows vehicle highlighted in red with risk label



python simulator.py --fault total\_rf\_down

\# All vehicles stop transmitting LoRa + ESP-NOW

\# Tests bottom row of fail-safe matrix — full RF DOWN state

```



\### 10.3 Core Simulator Code



```python

import asyncio, json, websockets, random, math, time



class DumperSimNode:

&#x20;   def \_\_init\_\_(self, vehicle\_id, lat, lng, heading, speed\_kmh):

&#x20;       self.id       = vehicle\_id

&#x20;       self.lat      = lat

&#x20;       self.lng      = lng

&#x20;       self.heading  = heading      # degrees 0-360

&#x20;       self.speed    = speed\_kmh

&#x20;       self.fault    = None         # 'gps\_dropout', 'rf\_loss', 'rollover'



&#x20;   def step(self, dt=3.0):

&#x20;       """Advance position by one time step using dead reckoning sim"""

&#x20;       v\_ms  = self.speed / 3.6

&#x20;       d\_lat = (v\_ms \* dt \* math.cos(math.radians(self.heading))) / 111320

&#x20;       d\_lng = (v\_ms \* dt \* math.sin(math.radians(self.heading))) / (

&#x20;                   111320 \* math.cos(math.radians(self.lat)))

&#x20;       self.lat     += d\_lat

&#x20;       self.lng     += d\_lng

&#x20;       self.heading += random.uniform(-2, 2)   # jitter simulates road curve



&#x20;   def to\_packet(self):

&#x20;       roll = 26.0 if self.fault == "rollover" else random.uniform(-2, 2)

&#x20;       return {

&#x20;           "vehicle\_id":   self.id,

&#x20;           "latitude":     round(self.lat, 7),

&#x20;           "longitude":    round(self.lng, 7),

&#x20;           "speed\_kmh":    self.speed,

&#x20;           "heading\_deg":  round(self.heading % 360, 1),

&#x20;           "pitch\_deg":    round(random.uniform(-3, 3), 1),

&#x20;           "roll\_deg":     round(roll, 1),

&#x20;           "status\_flags": 0b00000100 if self.fault == "gps\_dropout" else 0b00000001,

&#x20;           "timestamp":    int(time.time()),

&#x20;           "fault":        self.fault

&#x20;       }

```



\---



\## 11. KNOWN LIMITATIONS \& HONEST ASSESSMENT



> Include a version of this in your SIH presentation slides. Judges respect engineering honesty — it shows maturity over a team that over-claims.



```

╔══════════════════════════════════════════════════════════════════════════════════╗

║                       KNOWN LIMITATIONS \& MITIGATIONS                          ║

╠══════════════════════════════╦═════════════════════════════════════════════════╣

║  Limitation                  ║  Mitigation / Phase Plan                        ║

╠══════════════════════════════╬═════════════════════════════════════════════════╣

║  Non-networked vehicles      ║  YOLOv8 + MLX90640 thermal for visual detect.   ║

║  (support jeeps, trucks      ║  Phase 2: Low-cost LoRa beacon tag (\~Rs.200)    ║

║  without our hardware)       ║  clipped to any vehicle in the mine fleet       ║

╠══════════════════════════════╬═════════════════════════════════════════════════╣

║  UWB multipath error in      ║  DW3000 has built-in NLOS detection — enable   ║

║  metallic mine environment   ║  it in firmware. TF-Luna ToF acts as backup    ║

║  may cause ±1-2m error       ║  physical ranging when UWB is unreliable        ║

╠══════════════════════════════╬═════════════════════════════════════════════════╣

║  IMU dead reckoning drifts   ║  Show "DR MODE — ESTIMATED" badge on map.       ║

║  \~30m per 5 minutes          ║  V2V collision avoidance unaffected (range-     ║

║                              ║  based, not GPS-based). Map view degrades,      ║

║                              ║  not safety.                                    ║

╠══════════════════════════════╬═════════════════════════════════════════════════╣

║  YOLOv8 FPS lower in heavy   ║  Target 8-12 FPS (honest claim). At 10 FPS    ║

║  fog with de-haze active     ║  and 10 km/h: 0.28m per frame — safe margins.  ║

╠══════════════════════════════╬═════════════════════════════════════════════════╣

║  No absolute NTP time sync   ║  GPS PPS as master clock when GPS active.       ║

║  between nodes (no internet) ║  status\_flags bit 4 set when clock may drift.   ║

╚══════════════════════════════╩═════════════════════════════════════════════════╝

```



\*\*Architecture verdict:\*\* The three-tier RF mesh with graceful degradation is the correct design philosophy for this environment. No single point of failure disables safety. The fail-safe matrix covers every realistic fault combination. This is production-quality thinking from a student team.



\---



\## 12. TEAM WEBUILDZ — ROLE ALLOCATION



```

┌─────────────────────────────────────────────────────────────────────────────┐

│                        TEAM WEBUILDZ ROLE MATRIX v2.0                       │

├─────────────────┬───────────────────┬─────────────────────────────────────┤

│  Team Member    │  Designation      │  Primary Responsibilities            │

├─────────────────┼───────────────────┼─────────────────────────────────────┤

│  Lead (You)     │  Hardware \&       │  • ESP32-S3 C++ Firmware            │

│                 │  System Integrator│  • Sensor Fusion (IMU + Mag + GPS)  │

│                 │                   │  • RF Mesh (LoRa + ESP-NOW + UWB)   │

│                 │                   │  • Fail-Safe State Machine           │

│                 │                   │  • System Debugging \& Live Pitch    │

├─────────────────┼───────────────────┼─────────────────────────────────────┤

│  Prasanna       │  Full-Stack Lead  │  • Node.js Express Backend          │

│                 │  (Telemetry)      │  • SerialPort USB to Socket.io relay│

│                 │                   │  • Telemetry State Machine           │

├─────────────────┼───────────────────┼─────────────────────────────────────┤

│  Shruti         │  Frontend Lead    │  • React.js Control Room Dashboard  │

│                 │  (UI / GIS)       │  • Leaflet.js Offline Map           │

│                 │                   │  • Three.js 3D Command Center View  │

│                 │                   │  • Canvas 2D In-Cabin Radar UI      │

├─────────────────┼───────────────────┼─────────────────────────────────────┤

│  Abhi           │  AI / Vision Lead │  • OpenCV Dark Channel De-Haze      │

│                 │                   │  • YOLOv8-Nano Fine-Tuning (ONNX)   │

│                 │                   │  • MLX90640 Thermal Integration      │

│                 │                   │  • Realistic FPS benchmarking       │

├─────────────────┼───────────────────┼─────────────────────────────────────┤

│  Adi            │  Simulation \&     │  • Python 15-Dumper Fleet Simulator │

│                 │  Data Analytics   │  • CLI Fault Injection System       │

│                 │                   │  • Rollover Risk RF Classifier      │

│                 │                   │  • Synthetic Telemetry Dataset      │

└─────────────────┴───────────────────┴─────────────────────────────────────┘

```



\---



\## 13. BUDGET \& PHASED IMPLEMENTATION



\### Phase 1 — Core RF Mesh (No College Help) — \~Rs.2,300



Proves the entire three-tier safety architecture. This is 80% of what SIH judges evaluate.



| Component | Qty | Est. Cost |

|-----------|-----|-----------|

| ESP32-S3-WROOM Dev Board | 2 | Rs.600 |

| SX1276 LoRa Ra-02 Module | 2 | Rs.400 |

| NEO-6M GPS Module | 1 | Rs.350 |

| MPU6050 IMU | 2 | Rs.160 |

| QMC5883L Magnetometer | 2 | Rs.160 |

| TF-Luna 8m ToF Sensor | 1 | Rs.400 |

| Buzzer + Strobe LED | — | Rs.100 |

| Breadboard + Jumper Wires | — | Rs.150 |

| \*\*TOTAL\*\* | | \*\*\~Rs.2,320\*\* |



What is demonstrated: LoRa fleet telemetry, ESP-NOW V2V collision alerts, IMU dead reckoning, heading fusion, rollover detection, full fail-safe matrix fired live via Python simulator, command center dashboard on a laptop.



\---



\### Phase 2 — Full Vision Stack (With College Support) — \~Rs.16,500



| Component | Qty | Est. Cost |

|-----------|-----|-----------|

| Everything in Phase 1 | — | Rs.2,320 |

| Raspberry Pi 4 (4GB) | 1 | Rs.7,000 |

| DW3000 UWB Module | 2 | Rs.4,000 |

| MLX90640 Thermal | 1 | Rs.1,500 |

| USB Dashcam (1080p) | 1 | Rs.800 |

| DC-DC Power Circuit (Option A) | — | Rs.300 |

| IP54 Enclosure + heatsink + fan | — | Rs.600 |

| \*\*TOTAL\*\* | | \*\*\~Rs.16,520\*\* |



\---



\## 14. CONTEXT RESET GUIDE (v2.0)



If the AI assistant context resets during development sessions:



1\. \*\*Re-upload this file\*\* (`WeBuildz\_SIH\_PS26007\_v2\_MASTER\_SPEC.md`) to the conversation.

2\. \*\*Issue this directive:\*\*

&#x20;  > \*"We are Team WeBuildz working on SIH PS 26007. I have uploaded our v2 Master Specification. Adopt your role as our Lead Systems Architect and assist with \[insert task: ESP32-S3 firmware, Node.js serial parser, Canvas 2D radar, Python simulator fault injection, QMC5883L complementary filter code, etc.]."\*



3\. \*\*Key v2.0 facts to remind the AI:\*\*

&#x20;  - QMC5883L magnetometer added for absolute heading — NOT MPU6050 alone

&#x20;  - DW3000 ONLY — DW1000 is EOL, incompatible register map

&#x20;  - ESP-NOW packets are binary packed C struct — not JSON (JSON is logical repr only)

&#x20;  - In-cabin UI is Canvas 2D radar — Three.js is command center (laptop) only

&#x20;  - TF-Luna (8m) replaces VL53L0X (2m) for front obstacle detection

&#x20;  - Dead reckoning uses BOTH x AND y equations with fused QMC5883L heading

&#x20;  - Random Forest scope: rollover only (fatigue/washout = Phase 2)

&#x20;  - Power for SIH demo: USB power bank (production: XL4016 24V-to-5V chain)

&#x20;  - YOLOv8 runtime: ONNX Runtime INT8 — NOT TensorRT (TensorRT is NVIDIA only)

&#x20;  - Realistic FPS claim: 8-12 FPS with de-haze active (not 20 FPS)



\---



\*End of WeBuildz SIH PS 26007 Master Specification v2.0\*  

\*All critical fixes from v1.0 applied. Rebuilt August 2026.\*  

\*Team WeBuildz — Hardware \& Systems Lead, Prasanna, Shruti, Abhi, Adi\*



