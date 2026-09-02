# 🚀 Mining Truck ADAS Prototype — Team Setup & Onboarding Guide

Welcome to the team! This document provides complete, step-by-step instructions for cloning, installing, and running the project on your local machine.

---

## 📋 Table of Contents
1. [Prerequisites & Software Installation](#1-prerequisites--software-installation)
2. [Accepting GitHub Collaboration Invite](#2-accepting-github-collaboration-invite)
3. [Cloning the Repository](#3-cloning-the-repository)
4. [Role-Specific Setup & Workflows](#4-role-specific-setup--workflows)
   - [Category A: UI & 3D Frontend Developer](#category-a-ui--3d-frontend-developer)
   - [Category B: Machine Learning & AI Developer](#category-b-machine-learning--ai-developer)
   - [Category C: Hardware & IoT Developer](#category-c-hardware--iot-developer)
   - [Category D: Full Integrated Prototype (Lead / Tester)](#category-d-full-integrated-prototype-lead--tester)
5. [Daily Git Workflow & Golden Rules](#5-daily-git-workflow--golden-rules)
6. [Common Troubleshooting & FAQ](#6-common-troubleshooting--faq)

---

## 1. Prerequisites & Software Installation

Before cloning the project, ensure you have the following software installed:

### 1.1 Git
- **Download**: [https://git-scm.com/downloads](https://git-scm.com/downloads)
- **Verify in Terminal / PowerShell**:
  ```bash
  git --version
  ```
- **Configure your Git identity** (run once):
  ```bash
  git config --global user.name "Your Name"
  git config --global user.email "your_email@example.com"
  ```

### 1.2 Node.js (v18+ or v20+ LTS)
- **Download**: [https://nodejs.org/](https://nodejs.org/) *(Choose LTS version)*
- **Verify in Terminal / PowerShell**:
  ```bash
  node -v
  npm -v
  ```

### 1.3 Python (v3.10 or higher)
- **Download**: [https://www.python.org/downloads/](https://www.python.org/downloads/)
- **CRITICAL**: During Python installation on Windows, make sure to check the box: **"Add python.exe to PATH"**.
- **Verify in Terminal / PowerShell**:
  ```bash
  python --version
  pip --version
  ```

### 1.4 Code Editor
- Recommended: **Visual Studio Code** ([https://code.visualstudio.com/](https://code.visualstudio.com/))

---

## 2. Accepting GitHub Collaboration Invite

This is a private repository. You must accept the collaborator invite before you can clone:

1. Log into your GitHub account.
2. Check your email inbox for the GitHub invitation link, or navigate directly to:  
   👉 **[https://github.com/HarshaTalap1474/SIH/invitations](https://github.com/HarshaTalap1474/SIH/invitations)**
3. Click **Accept Invitation**.

---

## 3. Cloning the Repository

Open **PowerShell** (Windows) or **Terminal** (macOS/Linux) in your desired project directory and run:

```bash
git clone https://github.com/HarshaTalap1474/SIH.git
cd SIH
```

> **Note on Login Prompt**: If prompted for credentials, select **"Sign in with your browser"** (Git Credential Manager) and sign in using your GitHub account.

---

## 4. Role-Specific Setup & Workflows

Find your category below and follow the exact commands for your branch.

---

### Category A: UI & 3D Frontend Developer

**Assigned Branch**: `internal/prototype-UI`  
**Focus Area**: Next.js 14, React Three Fiber (Three.js), Tailwind CSS, Real-Time HUD Dashboard, Vehicle Controls & Cameras.

#### Step 1: Switch to the UI Branch
```bash
git checkout internal/prototype-UI
```

#### Step 2: Install UI Dependencies
```bash
cd "Internal Prototype/UI"
npm install
```

#### Step 3: Run the 3D Mining Simulation
```bash
npm run dev
```

#### Step 4: Open in Browser
Open your browser at: **`http://localhost:3000`**

#### 🔄 UI Daily Git Workflow:
```bash
# Morning / Start of task: Get latest updates
git pull origin internal/prototype-UI

# Make your changes in "Internal Prototype/UI/"...

# Evening / End of task: Save and push your progress
git add .
git commit -m "feat(ui): add new sensor gauge component"
git push origin internal/prototype-UI
```

---

### Category B: Machine Learning & AI Developer

**Assigned Branch**: `internal/prototype-ML`  
**Focus Area**: TinyML Collision Model, PyTorch / NumPy Neural Network, Dataset Generation, WebSocket Real-Time Inference Server.

#### Step 1: Switch to the ML Branch
```bash
git checkout internal/prototype-ML
```

#### Step 2: Install Python Dependencies
```bash
cd "Internal Prototype/ML Model"
pip install -r requirements.txt
```

#### Step 3: Start the WebSocket Inference Server
```bash
python inference_server.py
```
*(Server will start on `ws://localhost:8765/ws/telemetry`)*

#### Step 4: Retraining the Neural Network (Optional / As Needed)
To regenerate 100,000 synthetic haul-road scenarios and retrain model weights:
```bash
python train.py
```
*(Saved weights are exported to `tinyml_weights.npz`)*

#### 🔄 ML Daily Git Workflow:
```bash
# Morning / Start of task: Get latest updates
git pull origin internal/prototype-ML

# Make your changes in "Internal Prototype/ML Model/"...

# Evening / End of task: Save and push your progress
git add .
git commit -m "feat(ml): tune AEB stopping distance threshold"
git push origin internal/prototype-ML
```

---

### Category C: Hardware & IoT Developer

**Assigned Branch**: `internal/prototype-HD`  
**Focus Area**: ESP32 / Arduino Microcontroller Firmware, MPU6050 6-DOF IMU, Ultrasonic / LiDAR Sensors, Serial-to-WebSocket Bridge.

#### Step 1: Switch to the Hardware Branch
```bash
git checkout internal/prototype-HD
```

#### Step 2: Telemetry Specifications
The hardware sensor feeds into the system via WebSocket payloads structured as follows:

```json
{
  "mpu6050": {
    "accel_g": { "x": 0.0, "y": 0.0, "z": 1.0 },
    "gyro_deg_per_sec": { "x": 0.0, "y": 0.0, "z": 0.0 },
    "orientation_deg": { "pitch": 0.0, "roll": 0.0, "yaw_heading": 0.0 },
    "road_anomaly_detected": false
  }
}
```

#### 🔄 Hardware Daily Git Workflow:
```bash
# Morning / Start of task: Get latest updates
git pull origin internal/prototype-HD

# Make your changes in "Internal Prototype/Hardware/"...

# Evening / End of task: Save and push your progress
git add .
git commit -m "feat(hardware): integrate MPU6050 I2C reading loop"
git push origin internal/prototype-HD
```

---

### Category D: Full Integrated Prototype (Lead / Tester)

**Assigned Branch**: `internal/prototype`  
**Focus Area**: Running the complete end-to-end system (Next.js 3D Frontend + Python TinyML Server concurrently).

#### Step 1: Switch to the Integrated Prototype Branch
```bash
git checkout internal/prototype
```

#### Step 2: Install All Dependencies
```bash
# Install UI dependencies
cd "Internal Prototype/UI"
npm install

# Install ML dependencies
cd "../ML Model"
pip install -r requirements.txt
```

#### Step 3: Run Both Services (Two Terminals Required)

**Terminal 1 (Python Inference Server):**
```bash
cd "Internal Prototype/ML Model"
python inference_server.py
```

**Terminal 2 (Next.js 3D Simulation):**
```bash
cd "Internal Prototype/UI"
npm run dev
```

#### Step 4: Open in Browser
Open **`http://localhost:3000`**. You should see the **`● AI LIVE`** status badge connected on the HUD.

#### 🔄 Integrated Prototype Daily Git Workflow:
```bash
# Morning / Start of task: Get latest updates
git pull origin internal/prototype

# Evening / End of task: Save and push your progress
git add .
git commit -m "fix: integrate latest UI and ML telemetry"
git push origin internal/prototype
```

---

## 5. Daily Git Workflow & Golden Rules

To ensure everyone can work simultaneously without merge conflicts, follow these rules:

### 🌟 Rule 1: Always Commit Before Pulling
Never run `git pull` if you have unsaved changes in your editor. Always commit locally first:
```bash
git add .
git commit -m "WIP: save my progress"
```
*(Only then run `git pull origin <your-branch>`)*

### 🌟 Rule 2: Stay in Your Assigned Folder
- UI developers edit files inside `Internal Prototype/UI/`.
- ML developers edit files inside `Internal Prototype/ML Model/`.
- Hardware developers edit files inside `Internal Prototype/Hardware/`.

### 🌟 Rule 3: Never Force Push
Never use `git push --force` or `git push -f`. This overwrites your teammates' work on GitHub.

---

## 6. Common Troubleshooting & FAQ

### Q1: "Cannot find module" or npm errors during `npm run dev`
**Solution**: Re-install node dependencies cleanly:
```bash
cd "Internal Prototype/UI"
rm -rf node_modules package-lock.json
npm install
```

### Q2: Python says `'python' is not recognized as an internal or external command`
**Solution**: Python was installed without adding it to the Windows PATH.
1. Re-run the Python installer.
2. Select **Modify**.
3. Check the box: **"Add Python to environment variables"** and complete setup.

### Q3: `Port 3000 is already in use`
**Solution**: Another Next.js process is running. Either stop the other terminal or Next.js will automatically prompt you to run on port 3001.

### Q4: HUD shows `○ OFFLINE (FALLBACK)` instead of `● AI LIVE`
**Solution**: The Python inference server is not running. Open a separate terminal and run:
```bash
cd "Internal Prototype/ML Model"
python inference_server.py
```

---

### 📞 Need Help?
If you run into any issues during setup, reach out to the project maintainer. Happy building! 🚀
