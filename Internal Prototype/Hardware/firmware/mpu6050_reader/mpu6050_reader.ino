/*
 * MPU-6050 Full Data Reader for ESP32-C3
 * -----------------------------------------------
 * Reads and prints:
 *   - Accelerometer  (X, Y, Z)  in g
 *   - Gyroscope      (X, Y, Z)  in °/s
 *   - Temperature               in °C and °F
 *
 * Wiring (ESP32-C3 defaults):
 *   MPU SDA  →  GPIO 8
 *   MPU SCL  →  GPIO 9
 *   MPU VCC  →  3.3 V
 *   MPU GND  →  GND
 *   MPU AD0  →  GND  (sets I2C address to 0x68)
 *
 * MPU-6050 datasheet register map reference used throughout.
 */

#include <Wire.h>

// ── Configuration ─────────────────────────────────────────
#define SDA_PIN      8
#define SCL_PIN      9
#define MPU_ADDR     0x68      // AD0 = LOW → 0x68 | AD0 = HIGH → 0x69
#define SAMPLE_MS    500       // Print interval in milliseconds
// ─────────────────────────────────────────────────────────

// ── MPU-6050 Register Addresses ───────────────────────────
#define REG_PWR_MGMT_1   0x6B
#define REG_CONFIG       0x1A
#define REG_GYRO_CONFIG  0x1B
#define REG_ACCEL_CONFIG 0x1C
#define REG_ACCEL_XOUT_H 0x3B  // First of 14 data bytes
#define REG_WHO_AM_I     0x75
// ─────────────────────────────────────────────────────────

// ── Full-scale range settings ─────────────────────────────
//  Accelerometer: 0=±2g  1=±4g  2=±8g  3=±16g
//  Gyroscope:     0=±250 1=±500 2=±1000 3=±2000 °/s
#define ACCEL_FS_SEL  0   // ±2 g
#define GYRO_FS_SEL   0   // ±250 °/s

// Divisors to convert raw int16 → physical units
const float ACCEL_SCALE[] = { 16384.0, 8192.0, 4096.0, 2048.0 }; // LSB/g
const float GYRO_SCALE[]  = { 131.0,  65.5,   32.8,   16.4   }; // LSB/(°/s)
// ─────────────────────────────────────────────────────────

// ── Data structure (must be defined before any function that uses it) ────────
struct MPUData {
  float ax, ay, az;     // Acceleration in g
  float gx, gy, gz;     // Angular velocity in °/s
  float tempC, tempF;   // Temperature
};
// ─────────────────────────────────────────────────────────

// ── Low-level I2C helpers ─────────────────────────────────

void writeRegister(uint8_t reg, uint8_t value) {
  Wire.beginTransmission(MPU_ADDR);
  Wire.write(reg);
  Wire.write(value);
  Wire.endTransmission();
}

uint8_t readRegister(uint8_t reg) {
  Wire.beginTransmission(MPU_ADDR);
  Wire.write(reg);
  Wire.endTransmission(false);
  Wire.requestFrom(MPU_ADDR, (uint8_t)1);
  return Wire.read();
}

// Read `len` bytes starting at `reg` into `buf`
void readBytes(uint8_t reg, uint8_t* buf, uint8_t len) {
  Wire.beginTransmission(MPU_ADDR);
  Wire.write(reg);
  Wire.endTransmission(false);
  Wire.requestFrom(MPU_ADDR, len);
  for (uint8_t i = 0; i < len; i++) {
    buf[i] = Wire.available() ? Wire.read() : 0;
  }
}

// Combine two bytes into a signed 16-bit integer (big-endian)
inline int16_t toInt16(uint8_t hi, uint8_t lo) {
  return (int16_t)((hi << 8) | lo);
}
// ─────────────────────────────────────────────────────────

// ── MPU initialisation ────────────────────────────────────
bool initMPU() {
  // Check WHO_AM_I register
  // 0x68 = genuine MPU-6050
  // 0x70 = MPU-6500 or common GY-521 clone
  // 0x19 = MPU-6886 (used in M5Stack)
  // Any non-0xFF response means a device is alive and talking
  uint8_t whoAmI = readRegister(REG_WHO_AM_I);
  Serial.printf("  WHO_AM_I = 0x%02X", whoAmI);
  if (whoAmI == 0xFF || whoAmI == 0x00) {
    Serial.println("  ← No response! Check wiring.");
    return false;
  }
  // Print friendly chip identification
  switch (whoAmI) {
    case 0x68: Serial.println("  ← MPU-6050 (genuine)");          break;
    case 0x70: Serial.println("  ← MPU-6500 or GY-521 clone");    break;
    case 0x19: Serial.println("  ← MPU-6886");                    break;
    case 0x71: Serial.println("  ← MPU-9250");                    break;
    default:   Serial.printf ("  ← Unknown variant (0x%02X) — proceeding anyway\n", whoAmI); break;
  }

  // Wake the MPU (clear sleep bit, use internal 8 MHz oscillator)
  writeRegister(REG_PWR_MGMT_1, 0x00);
  delay(100);

  // Optional: use PLL with X-axis gyro as clock source (more stable)
  writeRegister(REG_PWR_MGMT_1, 0x01);
  delay(10);

  // DLPF: digital low-pass filter → bandwidth ~44 Hz accel / 42 Hz gyro
  writeRegister(REG_CONFIG, 0x03);

  // Accelerometer full-scale range
  writeRegister(REG_ACCEL_CONFIG, ACCEL_FS_SEL << 3);

  // Gyroscope full-scale range
  writeRegister(REG_GYRO_CONFIG, GYRO_FS_SEL << 3);

  return true;
}
// ─────────────────────────────────────────────────────────

// ── Read all sensor data in one burst ────────────────────
MPUData readMPU() {
  uint8_t raw[14];
  readBytes(REG_ACCEL_XOUT_H, raw, 14);

  // Raw int16 values
  int16_t rawAx   = toInt16(raw[0],  raw[1]);
  int16_t rawAy   = toInt16(raw[2],  raw[3]);
  int16_t rawAz   = toInt16(raw[4],  raw[5]);
  int16_t rawTemp = toInt16(raw[6],  raw[7]);
  int16_t rawGx   = toInt16(raw[8],  raw[9]);
  int16_t rawGy   = toInt16(raw[10], raw[11]);
  int16_t rawGz   = toInt16(raw[12], raw[13]);

  MPUData d;
  float ascale = ACCEL_SCALE[ACCEL_FS_SEL];
  float gscale = GYRO_SCALE[GYRO_FS_SEL];

  d.ax = rawAx / ascale;
  d.ay = rawAy / ascale;
  d.az = rawAz / ascale;

  d.gx = rawGx / gscale;
  d.gy = rawGy / gscale;
  d.gz = rawGz / gscale;

  // MPU-6050 datasheet formula: Temp(°C) = rawTemp / 340.0 + 36.53
  d.tempC = rawTemp / 340.0f + 36.53f;
  d.tempF = d.tempC * 9.0f / 5.0f + 32.0f;

  return d;
}
// ─────────────────────────────────────────────────────────

void setup() {
  Serial.begin(115200);
  while (!Serial) delay(10);  // USB-CDC ready (ESP32-C3)
  delay(500);

  Serial.println();
  Serial.println("=========================================");
  Serial.println("  ESP32-C3  MPU-6050  Data Reader");
  Serial.println("=========================================");
  Serial.printf ("  Address : 0x%02X\n", MPU_ADDR);
  Serial.printf ("  SDA     : GPIO %d\n", SDA_PIN);
  Serial.printf ("  SCL     : GPIO %d\n", SCL_PIN);
  Serial.printf ("  Accel FS: ±%dg\n",   2 << ACCEL_FS_SEL);   // 2,4,8,16
  Serial.printf ("  Gyro FS : ±%d°/s\n", 250 << GYRO_FS_SEL);  // 250,500,…
  Serial.println("-----------------------------------------");

  Wire.begin(SDA_PIN, SCL_PIN);
  Wire.setClock(400000UL);

  Serial.println("Initialising MPU-6050 ...");
  if (!initMPU()) {
    Serial.println();
    Serial.println("ERROR: MPU-6050 not responding correctly.");
    Serial.println("  → Check wiring and power supply.");
    Serial.println("  → Run the I2C scanner sketch first.");
    while (true) delay(1000);  // Halt
  }

  Serial.println("MPU-6050 ready.\n");
  Serial.println("  Accel (g)          Gyro (°/s)          Temp");
  Serial.println("  X       Y       Z  X       Y       Z   °C     °F");
  Serial.println("  ─────────────────────────────────────────────────");
}

void loop() {
  MPUData d = readMPU();

  // Print in a tidy, aligned table row
  Serial.printf(
    "  %+7.3f %+7.3f %+7.3f  %+8.2f %+8.2f %+8.2f   %5.2f  %5.2f\n",
    d.ax, d.ay, d.az,
    d.gx, d.gy, d.gz,
    d.tempC, d.tempF
  );

  delay(SAMPLE_MS);
}
