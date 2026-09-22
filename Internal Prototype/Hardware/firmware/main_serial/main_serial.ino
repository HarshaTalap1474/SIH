/*
 * HEM MINE ADAS — ESP32-C3 Super Mini Firmware (USB Serial)
 * MPU6050 (6-DOF IMU) + 5 buttons → JSON over USB Serial @50Hz
 *
 * WIRED MODE: No WiFi/WebSocket — data sent over native USB CDC serial.
 * Browser reads via Web Serial API (Chrome/Edge).
 *
 * Same MPU6050 manual register driver as main.ino (bypasses Adafruit
 * WHO_AM_I check for clone chips at 0x68/0x69/0x70/0x72).
 *
 * Wiring (identical to WiFi version):
 *   MPU6050  SDA → GPIO7 | SCL → GPIO6 | VCC → 3V3 | GND → GND
 *   AD0 → LEAVE UNCONNECTED (floating)
 *   BTN_THROTTLE → GPIO1 | BTN_BRAKE → GPIO3 | BTN_LEFT → GPIO4
 *   BTN_RIGHT → GPIO5   | BTN_ESTOP → GPIO10
 *   Built-in LED → GPIO8 (active-low: LOW=ON, HIGH=OFF)
 *
 * LED behavior:
 *   Blink 3x fast at boot → calibrating
 *   Solid ON              → running & streaming
 *
 * Libraries: Wire (built-in) — NO external libraries needed
 */

#include <Wire.h>

// ─── PIN CONFIG ────────────────────────────────────────────
#define I2C_SDA 7
#define I2C_SCL 6

#define BTN_THROTTLE 1
#define BTN_BRAKE    3
#define BTN_LEFT     4
#define BTN_RIGHT    5
#define BTN_ESTOP    10

#define LED_PIN 8  // Built-in LED (active-low on ESP32-C3 Super Mini)

// ─── SERIAL BAUD ───────────────────────────────────────────
// USB CDC baud is virtual (USB operates at full speed regardless),
// but both sides must agree on the value.
#define SERIAL_BAUD 921600

// ─── MPU6050 REGISTERS ────────────────────────────────────
#define MPU_PWR_MGMT_1   0x6B
#define MPU_SMPLRT_DIV   0x19
#define MPU_CONFIG       0x1A
#define MPU_GYRO_CONFIG  0x1B
#define MPU_ACCEL_CONFIG 0x1C
#define MPU_ACCEL_XOUT_H 0x3B
#define MPU_WHO_AM_I     0x75

// ±2g → 16384 LSB/g | ±250°/s → 131 LSB/(°/s)
const float ACCEL_SCALE = 16384.0f;
const float GYRO_SCALE  = 131.0f;

uint8_t mpuAddr = 0x68;

// Calibration offsets (computed at boot)
float axOffset = 0, ayOffset = 0, azOffset = 0;
float gxOffset = 0, gyOffset = 0, gzOffset = 0;

// Complementary filter state
float pitch = 0, roll = 0, yaw = 0;
unsigned long lastUpdate = 0;

// Sensor data for broadcast
float axG = 0, ayG = 0, azG = 1.0f;
bool roadAnomaly = false;

// Button state
const int btnPins[5] = {BTN_THROTTLE, BTN_BRAKE, BTN_LEFT, BTN_RIGHT, BTN_ESTOP};
bool btnState[5] = {};
unsigned long btnChangeTime[5] = {};
#define DEBOUNCE_MS 25

bool btnThr = false, btnBrake = false, btnLeft = false, btnRight = false, btnEstop = false;

// ─── I2C HELPERS ──────────────────────────────────────────
bool writeReg(uint8_t addr, uint8_t reg, uint8_t val) {
  Wire.beginTransmission(addr);
  Wire.write(reg);
  Wire.write(val);
  return Wire.endTransmission() == 0;
}
  
uint8_t readReg(uint8_t addr, uint8_t reg) {
  Wire.beginTransmission(addr);
  Wire.write(reg);
  Wire.endTransmission(false);
  Wire.requestFrom(addr, (uint8_t)1);
  return Wire.available() ? Wire.read() : 0xFF;
}

// 14-byte burst: Accel(6) + Temp(2) + Gyro(6) in one I2C transaction
bool readMpuBurst(float acc[3], float gyro[3]) {
  Wire.beginTransmission(mpuAddr);
  Wire.write(MPU_ACCEL_XOUT_H);
  if (Wire.endTransmission(false) != 0) return false;
  if (Wire.requestFrom(mpuAddr, (uint8_t)14) < 14) return false;

  int16_t raw[7]; // ax,ay,az,temp,gx,gy,gz
  for (int i = 0; i < 7; i++)
    raw[i] = (int16_t)((Wire.read() << 8) | Wire.read());

  acc[0]  = raw[0] / ACCEL_SCALE;
  acc[1]  = raw[1] / ACCEL_SCALE;
  acc[2]  = raw[2] / ACCEL_SCALE;
  // raw[3] = temperature, skipped
  gyro[0] = raw[4] / GYRO_SCALE;
  gyro[1] = raw[5] / GYRO_SCALE;
  gyro[2] = raw[6] / GYRO_SCALE;
  return true;
}

// ─── MPU6050 INIT ─────────────────────────────────────────
bool mpuInit() {
  if (!writeReg(mpuAddr, MPU_PWR_MGMT_1, 0x00)) return false; // wake
  delay(10);
  writeReg(mpuAddr, MPU_SMPLRT_DIV, 0x01);   // 500Hz sample rate
  writeReg(mpuAddr, MPU_CONFIG, 0x03);        // DLPF ~44Hz accel, ~42Hz gyro
  writeReg(mpuAddr, MPU_GYRO_CONFIG, 0x00);   // FS_SEL=0 → ±250°/s
  writeReg(mpuAddr, MPU_ACCEL_CONFIG, 0x00);  // AFS_SEL=0 → ±2g
  delay(10);

  uint8_t who = readReg(mpuAddr, MPU_WHO_AM_I);
  Serial.printf("[MPU] WHO_AM_I=0x%02X addr=0x%02X\n", who, mpuAddr);
  return true;
}

// ─── CALIBRATION (accel + gyro, ~500 samples) ─────────────
void calibrate() {
  Serial.println("[CAL] Keep board LEVEL & STILL...");
  delay(500);

  const int N = 500;
  float sa[3] = {}, sg[3] = {};
  int good = 0;
  float a[3], g[3];

  for (int i = 0; i < N; i++) {
    if (readMpuBurst(a, g)) {
      for (int j = 0; j < 3; j++) { sa[j] += a[j]; sg[j] += g[j]; }
      good++;
    }
    delay(2);
  }

  if (good > 0) {
    axOffset = sa[0] / good;
    ayOffset = sa[1] / good;
    azOffset = sa[2] / good - 1.0f;
    gxOffset = sg[0] / good;
    gyOffset = sg[1] / good;
    gzOffset = sg[2] / good;
  }

  Serial.printf("[CAL] Accel offsets: ax=%.4f ay=%.4f az=%.4f\n", axOffset, ayOffset, azOffset);
  Serial.printf("[CAL] Gyro  offsets: gx=%.4f gy=%.4f gz=%.4f (n=%d)\n", gxOffset, gyOffset, gzOffset, good);
}

// ─── LED HELPERS ──────────────────────────────────────────
inline void ledOn()  { digitalWrite(LED_PIN, LOW); }   // active-low
inline void ledOff() { digitalWrite(LED_PIN, HIGH); }

// ─── BUTTON DEBOUNCE ──────────────────────────────────────
bool readBtn(int idx) {
  bool raw = digitalRead(btnPins[idx]) == LOW;
  unsigned long now = millis();
  if (raw != btnState[idx] && (now - btnChangeTime[idx]) > DEBOUNCE_MS) {
    btnState[idx] = raw;
    btnChangeTime[idx] = now;
  }
  return btnState[idx];
}

// ─── SERIAL BROADCAST ─────────────────────────────────────
void broadcastState() {
  char buf[256];
  snprintf(buf, sizeof(buf),
    "{\"mpu\":{\"pitch\":%.2f,\"roll\":%.2f,\"yaw\":%.1f,"
    "\"ax\":%.3f,\"ay\":%.3f,\"az\":%.3f,\"anomaly\":%s},"
    "\"btn\":{\"throttle\":%s,\"brake\":%s,\"left\":%s,\"right\":%s,\"estop\":%s}}",
    pitch, roll, yaw, axG, ayG, azG,
    roadAnomaly ? "true" : "false",
    btnThr ? "true" : "false", btnBrake ? "true" : "false",
    btnLeft ? "true" : "false", btnRight ? "true" : "false",
    btnEstop ? "true" : "false");

  Serial.println(buf);
}

// ─── SETUP ────────────────────────────────────────────────
void setup() {
  Serial.begin(SERIAL_BAUD);
  delay(200);
  Serial.println("\n[HW] Booting ESP32-C3 MINE ADAS (USB Serial Mode)...");

  // LED
  pinMode(LED_PIN, OUTPUT);
  ledOff();

  // Buttons
  for (int i = 0; i < 5; i++) pinMode(btnPins[i], INPUT_PULLUP);

  // Boot blink (3x fast = calibrating)
  for (int i = 0; i < 6; i++) { digitalWrite(LED_PIN, i % 2 ? HIGH : LOW); delay(100); }
  ledOff();

  // I2C
  Wire.begin(I2C_SDA, I2C_SCL, 100000);

  // Probe MPU6050 address
  uint8_t candidates[] = {0x68, 0x69, 0x70, 0x72};
  bool found = false;
  for (uint8_t c : candidates) {
    Wire.beginTransmission(c);
    if (Wire.endTransmission() == 0) {
      mpuAddr = c;
      found = true;
      Serial.printf("[I2C] MPU6050 at 0x%02X\n", mpuAddr);
      break;
    }
  }
  if (!found) { Serial.println("[ERR] No MPU6050!"); while (1) delay(100); }
  if (!mpuInit()) { Serial.println("[ERR] MPU init fail!"); while (1) delay(100); }

  calibrate();

  ledOn(); // solid ON = running
  lastUpdate = millis();
  Serial.println("[HW] Ready @50Hz (USB Serial)");
}

// ─── LOOP (50Hz) ──────────────────────────────────────────
void loop() {
  unsigned long now = millis();
  float dt = (now - lastUpdate) / 1000.0f;
  if (dt < 0.02f) return; // 50Hz cadence
  lastUpdate = now;
  if (dt > 0.1f) dt = 0.1f; // clamp gaps

  // Read MPU (14-byte burst)
  float acc[3], gyro[3];
  if (readMpuBurst(acc, gyro)) {
    // Apply calibration offsets
    acc[0] -= axOffset;
    acc[1] -= ayOffset;
    acc[2] -= azOffset;
    float gx = gyro[0] - gxOffset;
    float gy = gyro[1] - gyOffset;
    float gz = gyro[2] - gzOffset;

    // Accel-derived angles
    float accelRoll  = atan2(acc[1], acc[2]) * 180.0f / PI;
    float accelPitch = atan2(-acc[0], sqrt(acc[1]*acc[1] + acc[2]*acc[2])) * 180.0f / PI;

    // Complementary filter
    const float alpha = 0.96f;
    roll  = alpha * (roll  + gx * dt) + (1.0f - alpha) * accelRoll;
    pitch = alpha * (pitch + gy * dt) + (1.0f - alpha) * accelPitch;
    yaw  += gz * dt;

    axG = acc[0]; ayG = acc[1]; azG = acc[2];
    float mag = sqrt(axG*axG + ayG*ayG + azG*azG);
    roadAnomaly = (mag > 1.6f);
  }

  // Buttons
  btnThr   = readBtn(0);
  btnBrake = readBtn(1);
  btnLeft  = readBtn(2);
  btnRight = readBtn(3);
  btnEstop = readBtn(4);

  broadcastState();
}
