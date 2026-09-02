/*
 * MPU I2C Scanner for ESP32-C3
 * -----------------------------------------------
 * Scans all 127 I2C addresses and prints any device
 * found, highlighting known MPU-family addresses.
 *
 * Common MPU I2C addresses:
 *   0x68  – MPU-6050 / MPU-6500 / MPU-9250 (AD0 = LOW)
 *   0x69  – MPU-6050 / MPU-6500 / MPU-9250 (AD0 = HIGH)
 *
 * ESP32-C3 default I2C pins:
 *   SDA = GPIO 8
 *   SCL = GPIO 9
 * (Change SDA_PIN / SCL_PIN below if your wiring differs)
 */

#include <Wire.h>

// ── Pin configuration ─────────────────────────────────────
#define SDA_PIN  8   // Change if needed
#define SCL_PIN  9   // Change if needed
#define I2C_FREQ 400000UL  // 400 kHz fast-mode
// ─────────────────────────────────────────────────────────

// Known MPU-family addresses for friendly labelling
struct KnownDevice {
  uint8_t address;
  const char* label;
};

static const KnownDevice KNOWN_DEVICES[] = {
  { 0x68, "MPU-6050 / MPU-6500 / MPU-9250 (AD0=LOW)"  },
  { 0x69, "MPU-6050 / MPU-6500 / MPU-9250 (AD0=HIGH)" },
  { 0x68, "ICM-20600 / ICM-20689 (AD0=LOW)"           },
  { 0x69, "ICM-20600 / ICM-20689 (AD0=HIGH)"          },
};

// Returns a label if address matches a known MPU, otherwise nullptr
const char* getMPULabel(uint8_t address) {
  for (auto& d : KNOWN_DEVICES) {
    if (d.address == address) return d.label;
  }
  return nullptr;
}

void setup() {
  Serial.begin(115200);
  while (!Serial) delay(10);   // Wait for Serial on USB-CDC (ESP32-C3)

  delay(1000);                 // Let power rails settle

  Serial.println();
  Serial.println("=========================================");
  Serial.println("   ESP32-C3  MPU / I2C  Scanner");
  Serial.println("=========================================");
  Serial.printf ("   SDA = GPIO %d   SCL = GPIO %d\n", SDA_PIN, SCL_PIN);
  Serial.printf ("   Bus speed : %lu Hz\n", I2C_FREQ);
  Serial.println("-----------------------------------------");

  // Initialise I2C bus
  Wire.begin(SDA_PIN, SCL_PIN);
  Wire.setClock(I2C_FREQ);

  Serial.println("Scanning I2C bus (0x01 – 0x7F) ...\n");

  uint8_t devicesFound = 0;

  for (uint8_t address = 1; address < 128; address++) {
    Wire.beginTransmission(address);
    uint8_t error = Wire.endTransmission();

    if (error == 0) {
      // ── Device acknowledged ───────────────────────────
      devicesFound++;
      Serial.printf("  [FOUND]  0x%02X (%3d decimal)", address, address);

      const char* label = getMPULabel(address);
      if (label) {
        Serial.printf("  <-- %s", label);
      }
      Serial.println();

    } else if (error == 4) {
      // ── Unknown / bus error ───────────────────────────
      Serial.printf("  [ERROR]  0x%02X – unknown error on this address\n", address);
    }
    // error == 2 (NACK on address) means nothing there – skip silently
  }

  Serial.println();
  Serial.println("-----------------------------------------");

  if (devicesFound == 0) {
    Serial.println("  No I2C devices found.");
    Serial.println();
    Serial.println("  Troubleshooting tips:");
    Serial.println("  1. Check SDA / SCL wiring.");
    Serial.println("  2. Ensure the MPU has power (3.3 V).");
    Serial.println("  3. Add 4.7 kΩ pull-ups on SDA & SCL if missing.");
    Serial.println("  4. Verify SDA_PIN / SCL_PIN match your wiring.");
  } else {
    Serial.printf("  Scan complete. %d device(s) found.\n", devicesFound);
  }

  Serial.println("=========================================\n");
}

void loop() {
  // Re-scan every 5 seconds so you can hot-plug devices
  delay(5000);

  Serial.println("Re-scanning ...");
  uint8_t devicesFound = 0;

  for (uint8_t address = 1; address < 128; address++) {
    Wire.beginTransmission(address);
    uint8_t error = Wire.endTransmission();

    if (error == 0) {
      devicesFound++;
      Serial.printf("  [FOUND]  0x%02X", address);

      const char* label = getMPULabel(address);
      if (label) Serial.printf("  <-- %s", label);
      Serial.println();
    }
  }

  if (devicesFound == 0) {
    Serial.println("  No devices detected.");
  } else {
    Serial.printf("  %d device(s) on the bus.\n\n", devicesFound);
  }
}
