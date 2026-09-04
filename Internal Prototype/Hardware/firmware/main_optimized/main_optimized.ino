/*
 * HEM MINE ADAS — ESP32-C3 Super Mini Firmware (OPTIMIZED V2)
 * ---------------------------------------------------------
 * Features:
 *  1. STANDARD tzapu WiFiManager (Default Page):
 *     - Launches default captive portal page that automatically scans nearby Wi-Fi.
 *     - Lets user pick local network, enter password, and connects.
 *     - Configurable timeout (180s).
 *     - Set FORCE_WIFI_PORTAL = true or hold E-Stop at boot to immediately open the portal.
 *  2. mDNS ZERO-CONFIG:
 *     - Hostname: ws://esp32-adas.local:81/ws
 *  3. HIGH-SPEED BURST 14-BYTE I2C READ:
 *     - Reads Accel + Temp + Gyro in a single transaction (cuts I2C bus latency in half).
 *  4. CLONE & GENUINE MPU6050 COMPATIBLE:
 *     - Manual register init bypasses WHO_AM_I check for addresses 0x68/0x70/0x72.
 *  5. RF POWER OPTIMIZATION:
 *     - WiFi.setTxPower(WIFI_POWER_19_5dBm) for maximum antenna output on Super Mini.
 *  6. CLIENT-AWARE BROADCAST:
 *     - Checks webSocket.connectedClients() > 0 to skip formatting when no client is listening.
 *  7. 50Hz WEBSOCKET BROADCAST (Port 81, /ws)
 *
 * Hardware Pinout (ESP32-C3 Super Mini):
 *   MPU6050 SDA -> GPIO7
 *   MPU6050 SCL -> GPIO6
 *   MPU6050 VCC -> 3V3
 *   MPU6050 GND -> GND
 *   MPU6050 AD0 -> LEAVE UNCONNECTED (floating)
 *
 *   BTN_THROTTLE -> GPIO1  (active-low to GND)
 *   BTN_BRAKE    -> GPIO3  (active-low to GND)
 *   BTN_LEFT     -> GPIO4  (active-low to GND)
 *   BTN_RIGHT    -> GPIO5  (active-low to GND)
 *   BTN_ESTOP    -> GPIO10 (active-low to GND)
 *
 * Required Arduino Libraries:
 *   - WiFiManager by tzapu
 *   - WebSockets by Markus Sattler
 *   (WiFi, Wire, ESPmDNS are built into ESP32 core)
 */

#include <WiFi.h>
#include <Wire.h>
#include <WebSocketsServer.h>
#include <WiFiManager.h>  // Install 'WiFiManager' by tzapu via Library Manager
#include <ESPmDNS.h>      // Built-in ESP32 mDNS responder

// Set to true if you want to ALWAYS launch tzapu's Wi-Fi scan portal on every boot:
const bool FORCE_WIFI_PORTAL = false;

// ---------------- USER CONFIG ----------------
const char* AP_NAME       = "ESP32-MINE-ADAS";
const char* MDNS_HOST     = "esp32-adas";

#define WS_PORT 81
#define WS_PATH "/ws"

#define I2C_SDA 7
#define I2C_SCL 6

#define BTN_THROTTLE 1
#define BTN_BRAKE    3
#define BTN_LEFT     4
#define BTN_RIGHT    5
#define BTN_ESTOP    10

// MPU6050 Registers
#define MPU6050_RA_PWR_MGMT_1   0x6B
#define MPU6050_RA_SMPLRT_DIV   0x19
#define MPU6050_RA_CONFIG       0x1A
#define MPU6050_RA_GYRO_CONFIG  0x1B
#define MPU6050_RA_ACCEL_CONFIG 0x1C
#define MPU6050_RA_ACCEL_XOUT_H 0x3B
#define MPU6050_WHO_AM_I        0x75

// Globals
uint8_t mpuAddr = 0x68;
const float GYRO_SCALE  = 65.5f;   // 500 deg/s -> FS_SEL=1
const float ACCEL_SCALE = 4096.0f;  // 8g -> AFS_SEL=2

float gxOffset = 0, gyOffset = 0, gzOffset = 0;
float pitch = 0, roll = 0, yaw = 0;
float axG = 0, ayG = 0, azG = 1.0;
bool roadAnomaly = false;

// Latest button state (module-level so we can re-send on client connect)
bool btnThr = false, btnBrake = false, btnLeft = false, btnRight = false, btnEstop = false;

unsigned long lastUpdate = 0;
int buttonPins[5] = {BTN_THROTTLE, BTN_BRAKE, BTN_LEFT, BTN_RIGHT, BTN_ESTOP};
bool btnState[5] = {false, false, false, false, false};
unsigned long lastBtnChange[5] = {0, 0, 0, 0, 0};
const unsigned long DEBOUNCE_MS = 25;

WebSocketsServer webSocket(WS_PORT);

// ---------------- I2C Low-Level Helpers ----------------
bool writeReg(uint8_t addr, uint8_t reg, uint8_t val) {
  Wire.beginTransmission(addr);
  Wire.write(reg);
  Wire.write(val);
  return (Wire.endTransmission() == 0);
}

uint8_t readReg(uint8_t addr, uint8_t reg) {
  Wire.beginTransmission(addr);
  Wire.write(reg);
  Wire.endTransmission(false);
  Wire.requestFrom(addr, (uint8_t)1);
  if (Wire.available()) return Wire.read();
  return 0xFF;
}

// Optimized 14-byte contiguous burst read (Accel 6B + Temp 2B + Gyro 6B)
bool readMpuBurst(float acc[3], float gyro[3]) {
  Wire.beginTransmission(mpuAddr);
  Wire.write(MPU6050_RA_ACCEL_XOUT_H);
  if (Wire.endTransmission(false) != 0) return false;

  uint8_t bytesRead = Wire.requestFrom(mpuAddr, (uint8_t)14);
  if (bytesRead < 14) return false;

  int16_t rawAx = (int16_t)((Wire.read() << 8) | Wire.read());
  int16_t rawAy = (int16_t)((Wire.read() << 8) | Wire.read());
  int16_t rawAz = (int16_t)((Wire.read() << 8) | Wire.read());
  Wire.read(); Wire.read(); // Skip temperature (2 bytes)
  int16_t rawGx = (int16_t)((Wire.read() << 8) | Wire.read());
  int16_t rawGy = (int16_t)((Wire.read() << 8) | Wire.read());
  int16_t rawGz = (int16_t)((Wire.read() << 8) | Wire.read());

  acc[0] = (float)rawAx / ACCEL_SCALE;
  acc[1] = (float)rawAy / ACCEL_SCALE;
  acc[2] = (float)rawAz / ACCEL_SCALE;

  gyro[0] = (float)rawGx / GYRO_SCALE;
  gyro[1] = (float)rawGy / GYRO_SCALE;
  gyro[2] = (float)rawGz / GYRO_SCALE;

  return true;
}

bool mpuInit() {
  if (!writeReg(mpuAddr, MPU6050_RA_PWR_MGMT_1, 0x00)) return false; // Wake up
  delay(10);
  writeReg(mpuAddr, MPU6050_RA_SMPLRT_DIV, 0x01);   // ~500Hz
  writeReg(mpuAddr, MPU6050_RA_CONFIG, 0x03);       // DLPF 21Hz
  writeReg(mpuAddr, MPU6050_RA_GYRO_CONFIG, 0x08);  // 500 deg/s
  writeReg(mpuAddr, MPU6050_RA_ACCEL_CONFIG, 0x10); // 8g
  delay(10);
  uint8_t who = readReg(mpuAddr, MPU6050_WHO_AM_I);
  Serial.printf("[MPU] WHO_AM_I = 0x%02X at addr 0x%02X\n", who, mpuAddr);
  return true;
}

void calibrateGyro(int samples = 200) {
  float a[3], g[3];
  float sx = 0, sy = 0, sz = 0;
  int n = 0;
  for (int i = 0; i < samples; i++) {
    if (readMpuBurst(a, g)) {
      sx += g[0]; sy += g[1]; sz += g[2];
      n++;
    }
    delay(3);
  }
  if (n > 0) {
    gxOffset = sx / n;
    gyOffset = sy / n;
    gzOffset = sz / n;
  }
  Serial.printf("[CAL] Gyro offsets calibrated: gx=%.4f, gy=%.4f, gz=%.4f\n", gxOffset, gyOffset, gzOffset);
}

// ---------------- Button Debounce ----------------
bool updateButton(int idx) {
  bool raw = (digitalRead(buttonPins[idx]) == LOW);
  unsigned long now = millis();
  if (raw != btnState[idx]) {
    if (now - lastBtnChange[idx] > DEBOUNCE_MS) {
      btnState[idx] = raw;
      lastBtnChange[idx] = now;
    }
  }
  return btnState[idx];
}

// ---------------- WebSocket Event ----------------
void webSocketEvent(uint8_t num, WStype_t type, uint8_t* payload, size_t length) {
  switch (type) {
    case WStype_CONNECTED:
      Serial.printf("[WS] Client %u connected\n", num);
      // Push CURRENT state immediately so the client never starts from stale data.
      broadcastState();
      break;
    case WStype_DISCONNECTED:
      Serial.printf("[WS] Client %u disconnected\n", num);
      // Actively tear down so any buffered lagging frames are dropped,
      // not replayed to the next connection.
      webSocket.disconnect(num);
      break;
    default:
      break;
  }
}

// Print WHY the chip booted (crash/reboot vs deliberate power-up). This lets us
// tell apart a WiFi-only drop from a full crash/reboot (which would explain
// "connects, works, then drops" if the firmware panics).
void logBootReason() {
  esp_reset_reason_t r = esp_reset_reason();
  const char* name;
  switch (r) {
    case ESP_RST_POWERON:        name = "POWER-ON"; break;
    case ESP_RST_SW:             name = "SOFTWARE (esp_restart)"; break;
    case ESP_RST_PANIC:          name = "PANIC/CRASH"; break;
    case ESP_RST_INT_WDT:        name = "INT WATCHDOG TIMEOUT"; break;
    case ESP_RST_TASK_WDT:       name = "TASK WATCHDOG TIMEOUT"; break;
    case ESP_RST_WDT:            name = "OTHER WATCHDOG"; break;
    case ESP_RST_DEEPSLEEP:      name = "DEEP-SLEEP WAKE"; break;
    case ESP_RST_BROWNOUT:       name = "BROWNOUT (low power)"; break;
    case ESP_RST_SDIO:           name = "SDIO"; break;
    case ESP_RST_USB:            name = "USB"; break;
    case ESP_RST_JTAG:           name = "JTAG"; break;
    case ESP_RST_EFUSE:          name = "EFUSE"; break;
    case ESP_RST_PWR_GLITCH:     name = "POWER-GLITCH"; break;
    case ESP_RST_CPU_LOCKUP:     name = "CPU LOCKUP"; break;
    default:                     name = "UNKNOWN"; break;
  }
  // Important: only a PANIC/watchdog/glitch is a CRASH. Power-on/software/USB are normal.
  Serial.printf("[BOOT] Reset reason: %d (%s)%s\n", (int)r, name,
    (r == ESP_RST_PANIC || r == ESP_RST_INT_WDT || r == ESP_RST_TASK_WDT || r == ESP_RST_WDT || r == ESP_RST_CPU_LOCKUP)
      ? "  <-- POSSIBLE CRASH" : "");
}

// ---------------- SETUP ----------------
void setup() {
  Serial.begin(115200);
  delay(200);
  Serial.println("\n[HW] Booting HEMM ADAS Super Mini Node (V2 Optimized)...");
  logBootReason();

  // Buttons: active-low with internal pullups
  for (int i = 0; i < 5; i++) {
    pinMode(buttonPins[i], INPUT_PULLUP);
  }

  // I2C @ 100kHz for maximum clone compatibility
  Wire.begin(I2C_SDA, I2C_SCL, 100000);

  // Address scan
  uint8_t candidates[] = {0x68, 0x69, 0x70, 0x72};
  bool found = false;
  for (uint8_t c : candidates) {
    Wire.beginTransmission(c);
    if (Wire.endTransmission() == 0) {
      mpuAddr = c;
      found = true;
      Serial.printf("[I2C] MPU6050 responding at 0x%02X\n", mpuAddr);
      break;
    }
  }

  if (!found) {
    Serial.println("[ERR] No MPU6050 found! Check wiring.");
    while (1) delay(100);
  }

  if (!mpuInit()) {
    Serial.println("[ERR] MPU init failed.");
    while (1) delay(100);
  }
  Serial.println("[OK] MPU initialized. Calibrating gyro (keep level & still)...");
  delay(500);
  calibrateGyro();

  // ---------------- Standard tzapu WiFiManager ----------------
  // ESP32-C3 fix: force AP+STA mode BEFORE WiFiManager so the AP beacon is always visible.
  WiFi.mode(WIFI_AP_STA);
  WiFi.setTxPower(WIFI_POWER_19_5dBm); // Maximum antenna output for C3

  // CRITICAL on ESP32-C3: core 3.3.x defaults to MODEM SLEEP (WIFI_PS_MIN_MODEM),
  // which causes WiFi dropouts/latency while streaming WebSocket data.
  WiFi.setSleep(false);

  // Detect WiFi drops at runtime for logging + re-arm mDNS on recovery.
  // The core already auto-reconnects STA on most failure reasons; this only logs
  // the event so we can see drops versus crashes in the serial log.
  WiFi.onEvent([](WiFiEvent_t event, WiFiEventInfo_t info) {
    if (event == ARDUINO_EVENT_WIFI_STA_DISCONNECTED) {
      Serial.printf("[WIFI] STA DISCONNECTED (reason=%u)\n", info.wifi_sta_disconnected.reason);
    } else if (event == ARDUINO_EVENT_WIFI_STA_CONNECTED) {
      Serial.println("[WIFI] STA reconnected — re-registering mDNS");
      if (MDNS.begin(MDNS_HOST)) {
        MDNS.addService("ws", "tcp", WS_PORT);
      }
    } else if (event == ARDUINO_EVENT_WIFI_STA_GOT_IP) {
      Serial.printf("[WIFI] Got IP: %s\n", WiFi.localIP().toString().c_str());
    }
  });

  WiFiManager wm;

  // Set timeout to 180 seconds (3 minutes)
  wm.setConfigPortalTimeout(180);

  bool connected = false;

  // If FORCE_WIFI_PORTAL is true OR E-STOP button held at boot, start captive portal immediately
  if (FORCE_WIFI_PORTAL || digitalRead(BTN_ESTOP) == LOW) {
    Serial.println("[WIFI] Starting tzapu's default WiFiManager portal ('ESP32-MINE-ADAS')...");
    connected = wm.startConfigPortal(AP_NAME);
  } else {
    Serial.println("[WIFI] Auto-connecting (or starting 'ESP32-MINE-ADAS' on failure)...");
    connected = wm.autoConnect(AP_NAME);
  }

  if (connected) {
    Serial.printf("[WIFI] Connected to network. IP: %s\n", WiFi.localIP().toString().c_str());
  } else {
    Serial.println("[WIFI] Portal timed out or connection failed -> starting standalone AP");
    // IMPORTANT: keep AP+STA mode (NOT switch to WIFI_AP). Switching to WIFI_AP
    // destroys the STA interface permanently, so the device could never rejoin
    // the network until reset. Stay in AP_STA so STA can recover later.
    WiFi.softAP(AP_NAME);
    delay(100);
    Serial.printf("[WIFI] Standalone AP active. IP: %s (STA kept alive in AP_STA mode)\n", WiFi.softAPIP().toString().c_str());
  }

  // ---------------- mDNS Zero-Config ----------------
  if (MDNS.begin(MDNS_HOST)) {
    Serial.printf("[mDNS] Responder active! Hostname: ws://%s.local:%d%s\n", MDNS_HOST, WS_PORT, WS_PATH);
    MDNS.addService("ws", "tcp", WS_PORT);
  } else {
    Serial.println("[mDNS] Error setting up MDNS responder!");
  }

  webSocket.begin();
  webSocket.onEvent(webSocketEvent);
  // Heartbeat: ping every 2s, drop a client that misses 2 pongs (4s) without replying.
  // Reliably detects dead/half-open connections so stale buffered frames are
  // never replayed to the next reconnect.
  webSocket.enableHeartbeat(2000, 3000, 2);
  Serial.printf("[WS] Server ready on ws://%s:%d%s (or ws://%s.local:%d%s)\n",
    (WiFi.status() == WL_CONNECTED ? WiFi.localIP().toString() : WiFi.softAPIP().toString()).c_str(),
    WS_PORT, WS_PATH, MDNS_HOST, WS_PORT, WS_PATH);

  lastUpdate = millis();
  Serial.println("[HW] Ready. Broadcasting MPU + buttons @50Hz.");
}

// ---------------- MAIN LOOP (50Hz Cadence) ----------------
// Build and broadcast the current sensor+button state to all LIVE clients.
// connectedClients(true) actively pings clients so stale half-open sockets
// (which cannot pong) are excluded and never accumulate a replay backlog.
void broadcastState() {
  if (webSocket.connectedClients(true) <= 0) {
    return; // no live listeners — do not build/push frames
  }
  char buf[280];
  snprintf(buf, sizeof(buf),
    "{\"mpu\":{\"pitch\":%.2f,\"roll\":%.2f,\"yaw\":%.1f,"
    "\"ax\":%.3f,\"ay\":%.3f,\"az\":%.3f,\"anomaly\":%s},"
    "\"btn\":{\"throttle\":%s,\"brake\":%s,\"left\":%s,\"right\":%s,\"estop\":%s}}",
    pitch, roll, yaw, axG, ayG, azG,
    roadAnomaly ? "true" : "false",
    btnThr ? "true" : "false", btnBrake ? "true" : "false",
    btnLeft ? "true" : "false", btnRight ? "true" : "false",
    btnEstop ? "true" : "false");

  webSocket.broadcastTXT(buf);
}

void loop() {
  webSocket.loop();

  unsigned long now = millis();
  float dt = (now - lastUpdate) / 1000.0f;
  if (dt < 0.02f) {
    return; // Wait for 20ms cadence (50 Hz)
  }
  lastUpdate = now;
  if (dt > 0.1f) dt = 0.1f;

  // 1. Read MPU (single 14-byte I2C burst)
  float acc[3], gyro[3];
  if (readMpuBurst(acc, gyro)) {
    float gx = gyro[0] - gxOffset;
    float gy = gyro[1] - gyOffset;
    float gz = gyro[2] - gzOffset;

    // Complementary filter (alpha = 0.98)
    float accelRoll  = atan2(acc[1], acc[2]) * 180.0f / PI;
    float accelPitch = atan2(-acc[0], sqrt(acc[1]*acc[1] + acc[2]*acc[2])) * 180.0f / PI;

    const float alpha = 0.98f;
    roll  = alpha * (roll  + gx * dt) + (1.0f - alpha) * accelRoll;
    pitch = alpha * (pitch + gy * dt) + (1.0f - alpha) * accelPitch;
    yaw  += gz * dt;

    axG = acc[0]; ayG = acc[1]; azG = acc[2];
    float magG = sqrt(axG*axG + ayG*ayG + azG*azG);
    roadAnomaly = (magG > 1.6f);
  }

  // 2. Read 5 Buttons
  btnThr   = updateButton(0);
  btnBrake = updateButton(1);
  btnLeft  = updateButton(2);
  btnRight = updateButton(3);
  btnEstop = updateButton(4);

  // 3. Broadcast WebSocket JSON to all live clients
  broadcastState();
}
