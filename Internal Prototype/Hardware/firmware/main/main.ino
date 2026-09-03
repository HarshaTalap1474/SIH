/*
 * HEM MINE ADAS — ESP32-C3 Super Mini Firmware (manual register MPU6050)
 * ---------------------------------------------------------
 * Reads MPU6050 (6-DOF IMU) + 5 physical buttons,
 * broadcasts JSON over WebSocket at 50 Hz.
 *
 * Uses a MANUAL register-based MPU6050 driver (raw Wire reads)
 * instead of Adafruit MPU6050. This is REQUIRED for clone/defective
 * MPU6050s whose WHO_AM_I chip ID does not match the Adafruit
 * library's hard-coded check — the Adafruit begin() rejects them and
 * returns frozen/no data. Manual register init works on real chips
 * AND clones at 0x68 / 0x70 / 0x72 etc.
 *
 * Wiring (ESP32-C3 Super Mini):
 *   MPU6050  VCC -> 3V3
 *   MPU6050  GND -> GND
 *   MPU6050  SDA -> GPIO7
 *   MPU6050  SCL -> GPIO6
 *   MPU6050  AD0 -> LEAVE UNCONNECTED (floating).
 *
 *   BTN_THROTTLE -> GPIO1  (active-low to GND)
 *   BTN_BRAKE    -> GPIO3  (active-low to GND)
 *   BTN_LEFT     -> GPIO4  (active-low to GND)
 *   BTN_RIGHT    -> GPIO5  (active-low to GND)
 *   BTN_ESTOP    -> GPIO10 (active-low to GND)
 *
 * WiFi: STA mode joins configured SSID.
 *       If connect fails, starts AP "ESP32-MINE-ADAS" (192.168.4.1).
 *
 * Libraries (Arduino Library Manager):
 *   - WebSockets (by Markus Sattler)
 *   - WiFi (built-in)
 *   - Wire (built-in)
 *
 * Broadcast URL: ws://<esp32-ip>:81/ws
 */

#include <WiFi.h>
#include <Wire.h>
#include <WebSocketsServer.h>

// ---------------- USER CONFIG ----------------
const char* WIFI_SSID     = "FLOOR-1";
const char* WIFI_PASSWORD = "Suraj@123";
const char* AP_NAME       = "ESP32-MINE-ADAS";

#define WS_PORT 81
#define WS_PATH "/ws"

#define I2C_SDA 7  // soldered: SDA -> GPIO7
#define I2C_SCL 6  // soldered: SCL -> GPIO6

#define BTN_THROTTLE 1
#define BTN_BRAKE    3
#define BTN_LEFT     4
#define BTN_RIGHT    5
#define BTN_ESTOP    10
// ----------------------------------------------

// ---------------- MPU6050 registers ----------------
#define MPU6050_RA_PWR_MGMT_1   0x6B
#define MPU6050_RA_SMPLRT_DIV   0x19
#define MPU6050_RA_CONFIG       0x1A
#define MPU6050_RA_GYRO_CONFIG  0x1B
#define MPU6050_RA_ACCEL_CONFIG 0x1C
#define MPU6050_RA_ACCEL_XOUT_H 0x3B
#define MPU6050_RA_GYRO_XOUT_H  0x43
#define MPU6050_WHO_AM_I        0x75

// Try several known MPU6050-style addresses (covers clones reporting 0x68/0x70/0x72)
uint8_t mpuAddr = 0x68;

// Gyro scale: 500 deg/s -> 65.5 LSB/(deg/s)
const float GYRO_SCALE = 65.5f;
// Accel scale with 8G FS_SEL=2 -> 4096 LSB/g
const float ACCEL_SCALE = 4096.0f;

// Gyro bias offsets (auto-calibrated at boot)
float gxOffset = 0, gyOffset = 0, gzOffset = 0;

// Complementary filter state
float pitch = 0, roll = 0, yaw = 0;
unsigned long lastUpdate = 0;

WebSocketsServer webSocket = WebSocketsServer(WS_PORT);

// Simple software debounce state
static bool lastBtn[5] = {false, false, false, false, false};
static unsigned long lastChange[5] = {0, 0, 0, 0, 0};
const unsigned long DEBOUNCE_MS = 30;

int buttonPins[5] = {BTN_THROTTLE, BTN_BRAKE, BTN_LEFT, BTN_RIGHT, BTN_ESTOP};

// ---------------- Low-level I2C helpers ----------------
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

// Read 6 bytes (one 3-axis block) at a register, returns true on success
bool read6(uint8_t addr, uint8_t reg, int16_t out[3]) {
  Wire.beginTransmission(addr);
  Wire.write(reg);
  if (Wire.endTransmission(false) != 0) return false;
  Wire.requestFrom(addr, (uint8_t)6);
  if (Wire.available() < 6) return false;
  for (int i = 0; i < 3; i++) {
    uint8_t hi = Wire.read();
    uint8_t lo = Wire.read();
    out[i] = (int16_t)((hi << 8) | lo);
  }
  return true;
}

// ---------------- MPU6050 manual init ----------------
bool mpuInit() {
  // Wake from sleep
  if (!writeReg(mpuAddr, MPU6050_RA_PWR_MGMT_1, 0x00)) return false;
  delay(10);

  // Sample rate = gyro rate / (1 + SMPLRT_DIV)
  writeReg(mpuAddr, MPU6050_RA_SMPLRT_DIV, 0x01);   // ~500Hz (1kHz/2)
  // DLPF 21Hz (bandwidth for stable accel)
  writeReg(mpuAddr, MPU6050_RA_CONFIG, 0x03);       // DLPF_CFG=3 -> 21Hz
  // Gyro full-scale 500 deg/s
  writeReg(mpuAddr, MPU6050_RA_GYRO_CONFIG, 0x08);  // FS_SEL=1 -> 500 deg/s
  // Accel full-scale 8g
  writeReg(mpuAddr, MPU6050_RA_ACCEL_CONFIG, 0x10); // AFS_SEL=2 -> 8g
  delay(10);

  uint8_t who = readReg(mpuAddr, MPU6050_WHO_AM_I);
  Serial.printf("[MPU] WHO_AM_I = 0x%02X (addr 0x%02X)\n", who, mpuAddr);
  // Note: do NOT require who==0x68 — clones return different IDs.
  return true;
}

// Read raw accel (g) and gyro (deg/s). Success returns true.
bool readMpu(float acc[3], float gyro[3]) {
  int16_t a[3], g[3];
  if (!read6(mpuAddr, MPU6050_RA_ACCEL_XOUT_H, a)) return false;
  if (!read6(mpuAddr, MPU6050_RA_GYRO_XOUT_H, g)) return false;
  for (int i = 0; i < 3; i++) {
    acc[i]  = a[i] / ACCEL_SCALE;   // g
    gyro[i] = g[i] / GYRO_SCALE;    // deg/s
  }
  return true;
}

// Calibrate gyro bias: sample N readings while stationary
void calibrateGyro(int samples = 200) {
  float a[3], g[3];
  float sx = 0, sy = 0, sz = 0;
  int n = 0;
  for (int i = 0; i < samples; i++) {
    if (readMpu(a, g)) {
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
  Serial.printf("[CAL] Gyro offsets: gx=%.4f gy=%.4f gz=%.4f (n=%d)\n", gxOffset, gyOffset, gzOffset, n);
}

void webSocketEvent(uint8_t num, WStype_t type, uint8_t* payload, size_t length) {
  switch (type) {
    case WStype_CONNECTED:
      Serial.printf("[WS] Client %u connected\n", num);
      break;
    case WStype_DISCONNECTED:
      Serial.printf("[WS] Client %u disconnected\n", num);
      break;
    default:
      break;
  }
}

// Debounced read of an active-low button -> returns true when pressed
bool readButton(int pin, int idx) {
  bool raw = (digitalRead(pin) == LOW); // active low
  unsigned long now = millis();
  if (raw != lastBtn[idx]) {
    if (now - lastChange[idx] > DEBOUNCE_MS) {
      lastBtn[idx] = raw;
      lastChange[idx] = now;
    } else {
      lastChange[idx] = now;
    }
  }
  return lastBtn[idx];
}

void setup() {
  Serial.begin(115200);
  delay(200);
  Serial.println("\n[HW] Booting ESP32-C3 MINE ADAS node...");

  // Buttons: active-low with internal pullups
  for (int i = 0; i < 5; i++) {
    pinMode(buttonPins[i], INPUT_PULLUP);
  }

  // I2C — 100kHz for maximum clone compatibility
  Wire.begin(I2C_SDA, I2C_SCL, 100000);

  // Probe candidate addresses, pick the first that ACKs
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
    Serial.println("[ERR] No MPU6050 found on GPIO6/7. Check SDA->GPIO7 / SCL->GPIO6 / VCC/GND wiring.");
    while (1) delay(100);
  }

  if (!mpuInit()) {
    Serial.println("[ERR] MPU6050 init failed (register write). Check power.");
    while (1) delay(100);
  }
  Serial.println("[OK] MPU6050 initialized (manual register mode). Keep board LEVEL & STILL...");
  delay(500);
  calibrateGyro(); // << must be still & level

  // WiFi: STA first, fall back to AP
  Serial.println("[WIFI] Connecting to STA network...");
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  unsigned long t0 = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - t0 < 10000) {
    delay(200);
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("[WIFI] Connected. IP: %s\n", WiFi.localIP().toString().c_str());
  } else {
    Serial.println("[WIFI] STA failed -> starting AP");
    WiFi.mode(WIFI_AP);
    WiFi.softAP(AP_NAME);
    delay(100);
    Serial.printf("[WIFI] AP started. IP: %s\n", WiFi.softAPIP().toString().c_str());
  }

  webSocket.begin();
  webSocket.onEvent(webSocketEvent);
  Serial.printf("[WS] Server on ws://%s:%d%s\n",
    (WiFi.status() == WL_CONNECTED ? WiFi.localIP().toString() : WiFi.softAPIP().toString()).c_str(),
    WS_PORT, WS_PATH);

  lastUpdate = millis();
  Serial.println("[HW] Ready. Broadcasting MPU + buttons @50Hz.");
}

void loop() {
  webSocket.loop();

  unsigned long now = millis();
  float dt = (now - lastUpdate) / 1000.0f;
  if (dt < 0.02f) {
    // 50 Hz cadence: wait until 20ms elapsed
    return;
  }
  lastUpdate = now;
  if (dt > 0.1f) dt = 0.1f; // clamp gap

  // ---- Read IMU (manual register) ----
  float acc[3], gyro[3];
  if (!readMpu(acc, gyro)) {
    // brief I2C glitch — skip this frame, don't wedge
    return;
  }

  float gx = gyro[0] - gxOffset;
  float gy = gyro[1] - gyOffset;
  float gz = gyro[2] - gzOffset;

  // Roll/Pitch from accelerometer (gravity projection), degrees
  float accelRoll  = atan2(acc[1], acc[2]) * 180.0f / PI;
  float accelPitch = atan2(-acc[0],
                          sqrt(acc[1] * acc[1] +
                               acc[2] * acc[2])) * 180.0f / PI;

  // Complementary filter (alpha 0.98)
  const float alpha = 0.98f;
  roll  = alpha * (roll  + gx * dt) + (1.0f - alpha) * accelRoll;
  pitch = alpha * (pitch + gy * dt) + (1.0f - alpha) * accelPitch;
  yaw  += gz * dt; // relative yaw (drifts without magnetometer)

  // Road anomaly: magnitude of acceleration (g)
  float axG = acc[0], ayG = acc[1], azG = acc[2];
  float magG = sqrt(axG * axG + ayG * ayG + azG * azG);
  bool anomaly = (magG > 1.6f); // beyond ~1g + margin -> impact

  // ---- Read Buttons ----
  bool thr   = readButton(BTN_THROTTLE, 0);
  bool brake = readButton(BTN_BRAKE,    1);
  bool left  = readButton(BTN_LEFT,     2);
  bool right = readButton(BTN_RIGHT,    3);
  bool estop = readButton(BTN_ESTOP,    4);

  // ---- Build JSON payload ----
  char buf[300];
  snprintf(buf, sizeof(buf),
    "{\"mpu\":{\"pitch\":%.2f,\"roll\":%.2f,\"yaw\":%.1f,"
    "\"ax\":%.3f,\"ay\":%.3f,\"az\":%.3f,\"anomaly\":%s},"
    "\"btn\":{\"throttle\":%s,\"brake\":%s,\"left\":%s,\"right\":%s,\"estop\":%s}}",
    pitch, roll, yaw, axG, ayG, azG,
    anomaly ? "true" : "false",
    thr ? "true" : "false", brake ? "true" : "false",
    left ? "true" : "false", right ? "true" : "false",
    estop ? "true" : "false");

  webSocket.broadcastTXT(buf);
}
