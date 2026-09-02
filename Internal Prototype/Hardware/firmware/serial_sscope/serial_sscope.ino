/*
 * HEM MINE ADAS — SERIAL PLOTTER/SSCOPE DIAGNOSTIC (serial_sscope.ino)
 * -------------------------------------------------------------
 * Like main.ino but prints human + sscope-friendly data to the
 * Serial Monitor instead of broadcasting over WebSocket.
 *
 *   - TILT DIRECTION line: which way the board is tilted,
 *     computed from accelerometer (pitch/roll).
 *   - BUTTON line: which button (Throttle/Brake/Left/Right/E-stop)
 *     is currently pressed.
 *   - GY_SCOPE / plotter-friendly: raw "label:value" lines you can
 *     plot in the Arduino Serial Plotter or GY-SScope.
 *
 * Uses the MANUAL register-based MPU6050 driver (works on the clone
 * chip at 0x68/0x70/0x72) — do NOT use Adafruit_MPU6050 here.
 *
 * Wiring (ESP32-C3 Super Mini):
 *   MPU6050  VCC -> 3V3, GND -> GND
 *   MPU6050  SDA -> GPIO7 (soldered), SCL -> GPIO6 (soldered)
 *   MPU6050  AD0 -> LEAVE UNCONNECTED (floating)
 *
 *   BTN_THROTTLE -> GPIO1  (active-low to GND)
 *   BTN_BRAKE    -> GPIO3
 *   BTN_LEFT     -> GPIO4
 *   BTN_RIGHT    -> GPIO5
 *   BTN_ESTOP    -> GPIO10
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

const float GYRO_SCALE  = 65.5f;   // 500 deg/s
const float ACCEL_SCALE = 4096.0f; // 8g

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
  Serial.printf("MPU6050 WHO_AM_I = 0x%02X at addr 0x%02X\n", who, mpuAddr);
  return true;
}

// Returns a short human-readable tilt direction string
String tiltDirection(float ax, float ay, float az) {
  float mag = sqrt(ax * ax + ay * ay + az * az);

  String dir;
  if (mag < 0.5f) {
    dir = "FREE-FALL/UNKNOWN";
  } else if (az >= 0.7f && fabs(ax) < 0.5f && fabs(ay) < 0.5f) {
    dir = "FLAT (top up)";
  } else if (az <= -0.7f && fabs(ax) < 0.5f && fabs(ay) < 0.5f) {
    dir = "FLAT (top DOWN)";
  } else {
    // Dominant edge(s) facing gravity
    bool xDown = ax >= 0.5f;
    bool xUp   = ax <= -0.5f;
    bool yDown = ay >= 0.5f;
    bool yUp   = ay <= -0.5f;
    if (xDown) dir += "X-EDGE DOWN (+X)";
    else if (xUp) dir += "X-EDGE DOWN (-X)";
    if (yDown) dir += (dir.length() ? " & " : "") + String("Y-EDGE DOWN (+Y)");
    else if (yUp) dir += (dir.length() ? " & " : "") + String("Y-EDGE DOWN (-Y)");
    if (dir.length() == 0) dir = "SHALLOW TILT";
  }
  return "TILT: " + dir;
}

void setup() {
  Serial.begin(115200);
  delay(200);
  Serial.println("\n===== SERIAL / GY-SSCOPE DIAGNOSTIC =====");
  Serial.println("Tilt the board and press buttons. Update every 250ms.");
  Serial.println("Gy-sscope mode: 'label:value' lines below (plot them).");
  Serial.println();

  pinMode(BTN_THROTTLE, INPUT_PULLUP);
  pinMode(BTN_BRAKE,    INPUT_PULLUP);
  pinMode(BTN_LEFT,     INPUT_PULLUP);
  pinMode(BTN_RIGHT,    INPUT_PULLUP);
  pinMode(BTN_ESTOP,    INPUT_PULLUP);

  Wire.begin(I2C_SDA, I2C_SCL, 100000);

  uint8_t candidates[] = {0x68, 0x69, 0x70, 0x72};
  bool found = false;
  for (uint8_t c : candidates) {
    Wire.beginTransmission(c);
    if (Wire.endTransmission() == 0) { mpuAddr = c; found = true; break; }
  }
  if (!found) {
    Serial.println("[ERR] No MPU6050 found. Check SDA->GPIO7 / SCL->GPIO6 / VCC/GND.");
    while (1) delay(100);
  }
  Serial.printf("[I2C] MPU6050 at 0x%02X\n", mpuAddr);
  if (!mpuInit()) {
    Serial.println("[ERR] MPU6050 init failed.");
    while (1) delay(100);
  }
  Serial.println("[OK] MPU6050 initialized. Go!\n");
}

void loop() {
  float a[3], g[3];
  if (readMpu(a, g)) {
    float ax = a[0], ay = a[1], az = a[2];

    float pitch = atan2(-ax, sqrt(ay * ay + az * az)) * 180.0f / PI;
    float roll  = atan2(ay, az) * 180.0f / PI;

    // Human-readable tilt direction
    Serial.print(tiltDirection(ax, ay, az));
    Serial.printf(" | pitch=%5.1f roll=%5.1f | ax=%5.2f ay=%5.2f az=%5.2f g\n", pitch, roll, ax, ay, az);

    // GY-SSCOPE / plotter-friendly lines (one per line, key:value)
    Serial.println("pitch:" + String(pitch, 1));
    Serial.println("roll:" + String(roll, 1));
    Serial.println("ax:" + String(ax, 2));
    Serial.println("ay:" + String(ay, 2));
    Serial.println("az:" + String(az, 2));
  } else {
    Serial.println("MPU READ FAIL");
  }

  // Which button is pressed (active-low)
  bool t = digitalRead(BTN_THROTTLE) == LOW;
  bool b = digitalRead(BTN_BRAKE)    == LOW;
  bool l = digitalRead(BTN_LEFT)     == LOW;
  bool r = digitalRead(BTN_RIGHT)    == LOW;
  bool e = digitalRead(BTN_ESTOP)    == LOW;

  String pressed = "NONE";
  if (e) pressed = "E-STOP";
  else if (t) pressed = "THROTTLE";
  else if (b) pressed = "BRAKE";
  else if (l) pressed = "LEFT";
  else if (r) pressed = "RIGHT";

  Serial.print("BUTTON PRESSED: ");
  Serial.println(pressed);
  Serial.println("btn-throttle:" + String(t ? 1 : 0));
  Serial.println("btn-brake:" + String(b ? 1 : 0));
  Serial.println("btn-left:" + String(l ? 1 : 0));
  Serial.println("btn-right:" + String(r ? 1 : 0));
  Serial.println("btn-estop:" + String(e ? 1 : 0));
  Serial.println("-----");

  delay(250);
}
