"""
Synthetic Haul-Road Encounter Dataset Generator for TinyML Training
Generates comprehensive open-cast mine obstacle avoidance scenarios.
"""

import numpy as np


def generate_haul_road_dataset(n_samples: int = 60000, seed: int = 42):
    """
    Generate synthetic dataset of vehicle telemetry and obstacle raycasts.
    
    Returns:
        X: np.ndarray of shape (n_samples, 9)
        y_risk: np.ndarray of shape (n_samples,) with class indices [0, 1, 2]
        y_brake: np.ndarray of shape (n_samples, 1) with values in [0.0, 1.0]
        y_steer: np.ndarray of shape (n_samples, 1) with values in [-1.0, 1.0]
    """
    np.random.seed(seed)

    # 1. Speeds (0 to 55 km/h for heavy mine dumpers)
    speeds_kmh = np.random.uniform(0.0, 52.0, size=n_samples).astype(np.float32)
    speeds_ms = speeds_kmh / 3.6

    # 2. Current steering angles (-1.0 left to 1.0 right)
    steer_angles = np.random.uniform(-0.6, 0.6, size=n_samples).astype(np.float32)

    # 3. Lateral offset from road center (-6.0m left to +6.0m right)
    lateral_offsets = np.random.uniform(-6.5, 6.5, size=n_samples).astype(np.float32)

    # 4. Rear sensor rays
    rays_rear = np.random.uniform(2.0, 60.0, size=n_samples).astype(np.float32)

    # 5. Generate Scenario Profiles
    # Scenario types:
    #   0: Clear open road (40%)
    #   1: Center direct obstacle (25%)
    #   2: Right-side obstacle / wall (15%)
    #   3: Left-side obstacle / wall (15%)
    #   4: Imminent extreme close-call (5%)
    scenarios = np.random.choice([0, 1, 2, 3, 4], size=n_samples, p=[0.40, 0.25, 0.15, 0.15, 0.05])

    ray_fl = np.zeros(n_samples, dtype=np.float32)
    ray_l = np.zeros(n_samples, dtype=np.float32)
    ray_c = np.zeros(n_samples, dtype=np.float32)
    ray_r = np.zeros(n_samples, dtype=np.float32)
    ray_fr = np.zeros(n_samples, dtype=np.float32)

    for i in range(n_samples):
        sc = scenarios[i]
        if sc == 0:
            # Clear road (long distance visibility)
            ray_fl[i] = np.random.uniform(35.0, 75.0)
            ray_l[i] = np.random.uniform(40.0, 80.0)
            ray_c[i] = np.random.uniform(45.0, 85.0)
            ray_r[i] = np.random.uniform(40.0, 80.0)
            ray_fr[i] = np.random.uniform(35.0, 75.0)

        elif sc == 1:
            # Obstacle directly ahead (boulder, excavator, stalled truck)
            d_obs = np.random.uniform(2.0, 45.0)
            ray_c[i] = d_obs
            ray_l[i] = d_obs + np.random.uniform(2.0, 15.0)
            ray_r[i] = d_obs + np.random.uniform(2.0, 15.0)
            ray_fl[i] = np.random.uniform(20.0, 60.0)
            ray_fr[i] = np.random.uniform(20.0, 60.0)

        elif sc == 2:
            # Obstacle / Berm on the right
            d_obs = np.random.uniform(3.0, 35.0)
            ray_r[i] = d_obs
            ray_fr[i] = max(1.5, d_obs - np.random.uniform(1.0, 5.0))
            ray_c[i] = d_obs + np.random.uniform(8.0, 25.0)
            ray_l[i] = np.random.uniform(30.0, 65.0)
            ray_fl[i] = np.random.uniform(30.0, 65.0)

        elif sc == 3:
            # Obstacle / Pit wall on the left
            d_obs = np.random.uniform(3.0, 35.0)
            ray_l[i] = d_obs
            ray_fl[i] = max(1.5, d_obs - np.random.uniform(1.0, 5.0))
            ray_c[i] = d_obs + np.random.uniform(8.0, 25.0)
            ray_r[i] = np.random.uniform(30.0, 65.0)
            ray_fr[i] = np.random.uniform(30.0, 65.0)

        elif sc == 4:
            # Imminent extreme danger (all frontal rays low)
            d_obs = np.random.uniform(1.0, 12.0)
            ray_fl[i] = d_obs + np.random.uniform(-0.5, 2.0)
            ray_l[i] = d_obs + np.random.uniform(-0.5, 2.0)
            ray_c[i] = d_obs
            ray_r[i] = d_obs + np.random.uniform(-0.5, 2.0)
            ray_fr[i] = d_obs + np.random.uniform(-0.5, 2.0)

    # 6. Compute Ground Truth Physics Labels
    # Heavy dumper braking model (150-ton vehicle, deceleration = 3.2 m/s^2, autonomous reaction time = 0.25s)
    a_brake = 3.2  # m/s^2
    t_react = 0.25  # seconds
    d_safe_stop = (speeds_ms * t_react) + ((speeds_ms ** 2) / (2.0 * a_brake)) + 3.0  # +3m safety buffer

    # Minimum forward clearance in the vehicle's trajectory
    min_fwd_clearance = np.minimum(ray_c, np.minimum(ray_l * 0.95, ray_r * 0.95))

    y_risk = np.zeros(n_samples, dtype=np.int64)
    y_brake = np.zeros((n_samples, 1), dtype=np.float32)
    y_steer = np.zeros((n_samples, 1), dtype=np.float32)

    for i in range(n_samples):
        v = speeds_ms[i]
        d_clear = min_fwd_clearance[i]
        d_req = d_safe_stop[i]

        # Classification & Braking Intensity
        if d_clear <= d_req or (d_clear < 8.0 and v > 1.5):
            # Critical: Must execute emergency braking immediately
            y_risk[i] = 2  # CRITICAL
            y_brake[i] = 1.0
        elif d_clear <= (d_req * 2.2 + 8.0):
            # Caution: Warning zone, prepare or apply partial braking
            y_risk[i] = 1  # CAUTION
            urgency = 1.0 - (d_clear - d_req) / max((d_req * 1.2 + 8.0), 1e-3)
            y_brake[i] = float(np.clip(urgency * 0.6, 0.1, 0.65))
        else:
            # Safe: Free driving
            y_risk[i] = 0  # SAFE
            y_brake[i] = 0.0

        # Optimal Steering Guidance
        # Compare left side clearance vs right side clearance
        left_clearance = (ray_fl[i] + ray_l[i] * 1.5) / 2.5
        right_clearance = (ray_fr[i] + ray_r[i] * 1.5) / 2.5
        center_clearance = ray_c[i]

        # Consider lateral road boundaries (don't steer off the road!)
        road_left_room = 7.0 + lateral_offsets[i]   # room to steer left
        road_right_room = 7.0 - lateral_offsets[i]  # room to steer right

        if center_clearance < 35.0:
            # There is an obstacle ahead, compute best escape vector
            left_score = left_clearance * min(road_left_room / 4.0, 1.2)
            right_score = right_clearance * min(road_right_room / 4.0, 1.2)

            score_diff = (right_score - left_score) / max((right_score + left_score), 1e-3)
            # Positive steer = steer right; Negative steer = steer left
            suggested_steer = float(np.clip(score_diff * 1.8, -1.0, 1.0))
            y_steer[i] = suggested_steer
        else:
            # Road is clear ahead: gently center the vehicle on the road
            center_correction = -float(lateral_offsets[i] / 8.0)
            y_steer[i] = float(np.clip(center_correction, -0.4, 0.4))

    # Assemble X feature matrix
    X = np.column_stack([
        ray_fl,
        ray_l,
        ray_c,
        ray_r,
        ray_fr,
        rays_rear,
        speeds_kmh,
        steer_angles,
        lateral_offsets,
    ]).astype(np.float32)

    return X, y_risk, y_brake, y_steer
