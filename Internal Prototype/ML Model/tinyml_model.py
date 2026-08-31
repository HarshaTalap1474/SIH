"""
TinyML Multi-Task Collision Avoidance & Path Guidance Neural Network
Designed for microsecond-latency inference on edge microcontrollers and Python backends.
"""

import json
import os
import numpy as np


class TinyMLCollisionModel:
    """
    Ultra-lightweight Multi-Task Neural Network for Mining Dumper ADAS:
      - Forward Collision Warning (FCW) & Time-to-Collision (TTC)
      - Autonomous Emergency Braking (AEB)
      - Safe Path Guidance / Evasive Steering Correction
    """

    FEATURE_NAMES = [
        "ray_far_left",    # 0: Distance at -45 deg (meters)
        "ray_left",        # 1: Distance at -20 deg (meters)
        "ray_center",      # 2: Distance directly ahead (meters)
        "ray_right",       # 3: Distance at +20 deg (meters)
        "ray_far_right",   # 4: Distance at +45 deg (meters)
        "ray_rear",        # 5: Distance behind truck (meters)
        "speed_kmh",       # 6: Current truck speed (km/h)
        "steer_angle",     # 7: Current steering angle [-1.0, 1.0]
        "lateral_offset",  # 8: Distance from road centerline (meters)
    ]

    NUM_INPUTS = 9
    HIDDEN_1 = 32
    HIDDEN_2 = 16
    HIDDEN_3 = 8
    NUM_CLASSES = 3  # 0: SAFE, 1: CAUTION, 2: CRITICAL

    def __init__(self, seed: int = 42):
        np.random.seed(seed)
        self.mean = np.zeros(self.NUM_INPUTS, dtype=np.float32)
        self.std = np.ones(self.NUM_INPUTS, dtype=np.float32)

        # He initialization for ReLU layers
        self.W1 = np.random.randn(self.NUM_INPUTS, self.HIDDEN_1).astype(np.float32) * np.sqrt(2.0 / self.NUM_INPUTS)
        self.b1 = np.zeros(self.HIDDEN_1, dtype=np.float32)

        self.W2 = np.random.randn(self.HIDDEN_1, self.HIDDEN_2).astype(np.float32) * np.sqrt(2.0 / self.HIDDEN_1)
        self.b2 = np.zeros(self.HIDDEN_2, dtype=np.float32)

        self.W3 = np.random.randn(self.HIDDEN_2, self.HIDDEN_3).astype(np.float32) * np.sqrt(2.0 / self.HIDDEN_2)
        self.b3 = np.zeros(self.HIDDEN_3, dtype=np.float32)

        # Multi-task output heads:
        # Head A: 3-class Collision Risk (Softmax)
        self.W_risk = np.random.randn(self.HIDDEN_3, self.NUM_CLASSES).astype(np.float32) * np.sqrt(2.0 / self.HIDDEN_3)
        self.b_risk = np.zeros(self.NUM_CLASSES, dtype=np.float32)

        # Head B: Autonomous Emergency Brake intensity [0.0, 1.0] (Sigmoid)
        self.W_brake = np.random.randn(self.HIDDEN_3, 1).astype(np.float32) * np.sqrt(2.0 / self.HIDDEN_3)
        self.b_brake = np.zeros(1, dtype=np.float32)

        # Head C: Path Guidance Steering Correction [-1.0, 1.0] (Tanh)
        self.W_steer = np.random.randn(self.HIDDEN_3, 1).astype(np.float32) * np.sqrt(2.0 / self.HIDDEN_3)
        self.b_steer = np.zeros(1, dtype=np.float32)

    @staticmethod
    def _relu(x: np.ndarray) -> np.ndarray:
        return np.maximum(0.0, x)

    @staticmethod
    def _sigmoid(x: np.ndarray) -> np.ndarray:
        return 1.0 / (1.0 + np.exp(-np.clip(x, -25.0, 25.0)))

    @staticmethod
    def _softmax(x: np.ndarray) -> np.ndarray:
        # Numerically stable softmax
        e_x = np.exp(x - np.max(x, axis=-1, keepdims=True))
        return e_x / np.sum(e_x, axis=-1, keepdims=True)

    def forward(self, X: np.ndarray):
        """
        Forward propagation with intermediate activations cached for training.
        """
        # Normalize input features
        X_norm = (X - self.mean) / np.maximum(self.std, 1e-6)

        # Hidden Layer 1
        z1 = np.dot(X_norm, self.W1) + self.b1
        a1 = self._relu(z1)

        # Hidden Layer 2
        z2 = np.dot(a1, self.W2) + self.b2
        a2 = self._relu(z2)

        # Hidden Layer 3 (Shared representation)
        z3 = np.dot(a2, self.W3) + self.b3
        a3 = self._relu(z3)

        # Output Heads
        logits_risk = np.dot(a3, self.W_risk) + self.b_risk
        prob_risk = self._softmax(logits_risk)

        logits_brake = np.dot(a3, self.W_brake) + self.b_brake
        pred_brake = self._sigmoid(logits_brake)

        logits_steer = np.dot(a3, self.W_steer) + self.b_steer
        pred_steer = np.tanh(logits_steer)

        cache = (X_norm, z1, a1, z2, a2, z3, a3, logits_risk, prob_risk, logits_brake, pred_brake, logits_steer, pred_steer)
        return prob_risk, pred_brake, pred_steer, cache

    def predict(self, feature_dict: dict) -> dict:
        """
        Ultra-fast single-instance inference for real-time WebSocket server.
        Latency: < 0.05 ms.
        """
        raw_x = np.array([
            float(feature_dict.get("ray_far_left", 50.0)),
            float(feature_dict.get("ray_left", 50.0)),
            float(feature_dict.get("ray_center", 50.0)),
            float(feature_dict.get("ray_right", 50.0)),
            float(feature_dict.get("ray_far_right", 50.0)),
            float(feature_dict.get("ray_rear", 50.0)),
            float(feature_dict.get("speed_kmh", 0.0)),
            float(feature_dict.get("steer_angle", 0.0)),
            float(feature_dict.get("lateral_offset", 0.0)),
        ], dtype=np.float32).reshape(1, -1)

        prob_risk, pred_brake, pred_steer, _ = self.forward(raw_x)

        risk_idx = int(np.argmax(prob_risk[0]))
        risk_labels = ["SAFE", "CAUTION", "CRITICAL"]
        risk_label = risk_labels[risk_idx]
        risk_confidence = float(prob_risk[0][risk_idx])

        brake_val = float(pred_brake[0][0])
        steer_val = float(pred_steer[0][0])

        speed_ms = float(feature_dict.get("speed_kmh", 0.0)) / 3.6
        ray_fl = float(feature_dict.get("ray_far_left", 50.0))
        ray_l = float(feature_dict.get("ray_left", 50.0))
        ray_c = float(feature_dict.get("ray_center", 50.0))
        ray_r = float(feature_dict.get("ray_right", 50.0))
        ray_fr = float(feature_dict.get("ray_far_right", 50.0))

        # Forward trajectory threat distance (matches dataset_generator geometry)
        fwd_threat_dist = min(ray_c, min(ray_l, ray_r) * 1.1)
        min_all_dist = min(ray_fl, ray_l, ray_c, ray_r, ray_fr)

        # Physics-based Time-to-Collision along vehicle travel trajectory
        ttc = (fwd_threat_dist / max(speed_ms, 0.1)) if speed_ms > 0.5 else 99.0
        ttc = round(min(ttc, 99.0), 2)

        # Imminent collision boundary along forward trajectory
        is_imminent = fwd_threat_dist < 5.0

        if is_imminent:
            risk_idx = 2
            risk_label = "CRITICAL"
            risk_confidence = max(risk_confidence, 0.98)

        # Emergency brake threshold trigger
        should_emergency_brake = risk_idx == 2 or brake_val > 0.60 or (ttc < 1.8 and fwd_threat_dist < 20.0) or is_imminent

        return {
            "collision_risk": risk_label,
            "risk_index": risk_idx,
            "confidence": round(risk_confidence, 4),
            "emergency_brake": bool(should_emergency_brake),
            "brake_intensity": round(max(brake_val if should_emergency_brake else 0.0, 1.0 if should_emergency_brake else 0.0), 3),
            "steering_guidance": round(steer_val, 3),
            "ttc_seconds": ttc,
            "closest_obstacle_m": round(fwd_threat_dist, 2),
        }

    def save(self, filepath: str):
        """Save trained model parameters and normalization statistics."""
        np.savez_compressed(
            filepath,
            mean=self.mean,
            std=self.std,
            W1=self.W1,
            b1=self.b1,
            W2=self.W2,
            b2=self.b2,
            W3=self.W3,
            b3=self.b3,
            W_risk=self.W_risk,
            b_risk=self.b_risk,
            W_brake=self.W_brake,
            b_brake=self.b_brake,
            W_steer=self.W_steer,
            b_steer=self.b_steer,
        )

    def load(self, filepath: str):
        """Load trained weights from file."""
        if not os.path.exists(filepath):
            raise FileNotFoundError(f"Model file not found: {filepath}")
        data = np.load(filepath)
        self.mean = data["mean"]
        self.std = data["std"]
        self.W1 = data["W1"]
        self.b1 = data["b1"]
        self.W2 = data["W2"]
        self.b2 = data["b2"]
        self.W3 = data["W3"]
        self.b3 = data["b3"]
        self.W_risk = data["W_risk"]
        self.b_risk = data["b_risk"]
        self.W_brake = data["W_brake"]
        self.b_brake = data["b_brake"]
        self.W_steer = data["W_steer"]
        self.b_steer = data["b_steer"]
