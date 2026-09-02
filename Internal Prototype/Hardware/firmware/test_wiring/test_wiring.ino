/*
 * HEM MINE ADAS — WIRING/SENSOR DIAGNOSTIC (test_wiring.ino)
 * -------------------------------------------------------------
 * Upload THIS sketch FIRST to verify every connection before
 * flashing the full main.ino. It prints to Serial Monitor @115200:
 *
 *   1. I2C scan -> confirms MPU6050 is on the bus and reports its addr
 *   2. Live MPU6050 pitch/roll/accel -> tilt the board, watch change
 *   3. Live button states -> press each button, watch flip LOW
 *
 * Uses a MANUAL register-based MPU6050 driver (raw Wire reads) instead
 * of Adafruit MPU6050. Required for clone/defective MPU6050s whose
 * WHO_AM_I chip ID (e.g. 0x70/0x72) does not match the Adafruit
 * library's hard-coded check — Adafruit's begin() rejects clones and
 * returns frozen/no data. Manual register init works on real chips
 * AND clones at any address (0x68 / 0x69 / 0x70 / 0x72).
 *
 * Wiring is IDENTICAL to main.ino:
 *   MPU6050: VCC->3V3 GND->GND SDA->GPIO7 SCL->GPIO6 AD0->UNCONNECTED
 *            (AD0 wired to GND caused frozen reads on tested boards.
 *             Leave it floating.)
 *   Buttons: GPIO1,3,4,5,10  (one leg to pin, other to GND)
 *
 * NOTE: You must hold the BOOT button during upload on some
 * ESP32-C3 Super Mini boards, or press BOOT+RST to enter
 * download mode if upload fails.
 */

#include <Wire.h>

#define I2C_SDA 7  // soldered: SDA -> GPIO7
#define I2C_SCL 6  // soldered: SCL -> GPIO6

#define BTN_THROTTLE 1
#define BTN_BRAKE    3
#define BTN_LEFT     4
#define BTN_RIGHT    5
#define BTN_ESTOP    10

// ---------------- MPU6050 registers ----------------
#define MPU6050_RA_PWR_MGMT_1   0x6B
#define MPU6050_RA_SMPLRT_DIV   0x19
#define MPU6050_RA_CONFIG       0x1A
#define MPU6050_RA_GYRO_CONFIG  0x1B
#define MPU6050_RA_ACCEL_CONFIG 0x1C
#define MPU6050_RA_ACCEL_XOUT_H 0x3B
#define MPU6050_RA_GYRO_XOUT_H  0x43
#define MPU6050_WHO_AM_I        0x75

uint8_t mpuAddr = 0x68;

// 500 deg/s -> 65.5 LSB/(deg/s); 8g -> 4096 LSB/g
const float GYRO_SCALE = 65.5f;
const float ACCEL_SCALE = 4096.0f;

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

bool mpuInit() {
  if (!writeReg(mpuAddr, MPU6050_RA_PWR_MGMT_1, 0x00)) return false;
  delay(10);
  writeReg(mpuAddr, MPU6050_RA_SMPLRT_DIV, 0x01);
  writeReg(mpuAddr, MPU6050_RA_CONFIG, 0x03);       // DLPF 21Hz
  writeReg(mpuAddr, MPU6050_RA_GYRO_CONFIG, 0x08);  // FS 500 deg/s
  writeReg(mpuAddr, MPU6050_RA_ACCEL_CONFIG, 0x10); // FS 8g
  delay(10);
  uint8_t who = readReg(mpuAddr, MPU6050_WHO_AM_I);
  Serial.printf("  MPU6050 WHO_AM_I = 0x%02X at addr 0x%02X\n", who, mpuAddr);
  return true;
}

void scanI2C() {
  Serial.println("\n=== I2C SCAN ===");
  byte error, address;
  int nDevices = 0;
  uint8_t candidates[] = {0x68, 0x69, 0x70, 0x72};
  for (address = 1; address < 127; address++) {
    Wire.beginTransmission(address);
    error = Wire.endTransmission();
    if (error == 0) {
      Serial.printf("  I2C device found at 0x%02X", address);
      bool isMpu = false;
      for (uint8_t c : candidates) if (c == address) isMpu = true;
      Serial.println(isMpu ? "  <-- likely MPU6050" : "");
      if (isMpu) mpuAddr = address;
      nDevices++;
    }
  }
  if (nDevices == 0) {
    Serial.println("  !! NO I2C DEVICE FOUND");
    Serial.println("  !! Check SDA->GPIO7, SCL->GPIO6, VCC->3V3, GND->GND");
  } else {
    Serial.print("  I2C scan OK: ");
    Serial.println(nDevices);
  }
}

void setup() {
  Serial.begin(115200);
  delay(200);

  pinMode(BTN_THROTTLE, INPUT_PULLUP);
  pinMode(BTN_BRAKE,    INPUT_PULLUP);
  pinMode(BTN_LEFT,     INPUT_PULLUP);
  pinMode(BTN_RIGHT,    INPUT_PULLUP);
  pinMode(BTN_ESTOP,    INPUT_PULLUP);

  Wire.begin(I2C_SDA, I2C_SCL, 100000);
  scanI2C();

  Serial.println("\n=== MPU6050 INIT (manual register mode) ===");
  if (!mpuInit()) {
    Serial.println("  !! MPU6050 init FAILED (register write). Check power/wiring & AD0 floating.");
  } else {
    Serial.println("  MPU6050 OK");
  }

  Serial.println("\n=== LIVE READOUT ===");
  Serial.println("Tilt the board; press each button. Values update every 500ms.");
  Serial.println("Pitch | Roll | AccZ_g | Ax_g | Ay_g | THR BRK LFT RGT EST (0=released, 1=pressed)");
}

void loop() {
  float a[3], g[3];
  if (readMpu(a, g)) {
    float pitch = atan2(-a[0], sqrt(a[1]*a[1] + a[2]*a[2])) * 180.0f / PI;
    float roll  = atan2(a[1], a[2]) * 180.0f / PI;

    int t = digitalRead(BTN_THROTTLE) == LOW ? 1 : 0;
    int b = digitalRead(BTN_BRAKE)    == LOW ? 1 : 0;
    int l = digitalRead(BTN_LEFT)     == LOW ? 1 : 0;
    int r = digitalRead(BTN_RIGHT)    == LOW ? 1 : 0;
    int e = digitalRead(BTN_ESTOP)    == LOW ? 1 : 0;

    Serial.printf("%7.1f | %7.1f | %5.2f | %5.2f | %5.2f |  %d   %d   %d   %d   %d\n",
      pitch, roll, a[2], a[0], a[1], t, b, l, r, e);
  } else {
    Serial.printf("%7s | %7s | %5s | %5s | %5s |  MPU READ FAIL\n", "-", "-", "-", "-", "-");
  }
  delay(500);
}
