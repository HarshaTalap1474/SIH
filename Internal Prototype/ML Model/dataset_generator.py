"""
Map-Aware Synthetic Haul-Road Encounter Dataset Generator for TinyML Training
Accurately models the open-pit mine haul road (18m width, side berms, turning loop, boulders).
Prevents false-positive threats from parallel road berms while strictly capturing genuine in-lane hazards.
"""

import numpy as np


def generate_haul_road_dataset(n_samples: int = 100000, seed: int = 42):
    """
    Generate synthetic dataset of vehicle telemetry and obstacle raycasts
    specifically aligned with the 3D mine site haul road map geometry.
    """
    np.random.seed(seed)

    # 1. Speeds (0 to 52 km/h for heavy mine dumpers)
    speeds_kmh = np.random.uniform(0.0, 52.0, size=n_samples).astype(np.float32)
    speeds_ms = speeds_kmh / 3.6

    # 2. Current steering angles (-1.0 left to 1.0 right)
    steer_angles = np.random.uniform(-0.6, 0.6, size=n_samples).astype(np.float32)

    # 3. Lateral offset from road center (-8.0m left to +8.0m right)
    # Haul road is 19.2m wide (-9.6m left berm to +9.6m right berm)
    lateral_offsets = np.random.uniform(-7.5, 7.5, size=n_samples).astype(np.float32)

    # 4. Heading angle relative to the road centerline (-45 deg to +45 deg)
    heading_deg = np.random.uniform(-35.0, 35.0, size=n_samples).astype(np.float32)

    # 5. Rear sensor rays
    rays_rear = np.random.uniform(5.0, 75.0, size=n_samples).astype(np.float32)

    # 6. Scenario Distribution:
    #   0: Normal In-Lane Cruising (Road is clear, berms are parallel to sides) -> 45%
    #   1: In-Lane Obstacle (Boulder / Stopped Equipment directly ahead in lane) -> 22%
    #   2: Road Boundary Deviation (Truck steering sharply towards left/right berm) -> 18%
    #   3: Turning Loop Navigation (Navigating circular loop curve) -> 10%
    #   4: Imminent Crash Scenario (High-speed close encounter) -> 5%
    scenarios = np.random.choice([0, 1, 2, 3, 4], size=n_samples, p=[0.45, 0.22, 0.18, 0.10, 0.05])

    ray_fl = np.zeros(n_samples, dtype=np.float32)
    ray_l = np.zeros(n_samples, dtype=np.float32)
    ray_c = np.zeros(n_samples, dtype=np.float32)
    ray_r = np.zeros(n_samples, dtype=np.float32)
    ray_fr = np.zeros(n_samples, dtype=np.float32)

    for i in range(n_samples):
        sc = scenarios[i]
        lat = lateral_offsets[i]
        head = heading_deg[i]

        # Calculate natural geometric clearance to straight road berms at x = -9.6 and +9.6
        dist_to_left_berm = max(1.0, 9.6 + lat)
        dist_to_right_berm = max(1.0, 9.6 - lat)

        if sc == 0:
            # Normal in-lane cruising: Forward path is completely clear (>60m).
            # Side rays detect the side berms at normal lane width (6 - 15m), which is SAFE!
            ray_c[i] = np.random.uniform(55.0, 90.0)
            ray_l[i] = dist_to_left_berm * np.random.uniform(1.8, 3.5)
            ray_fl[i] = dist_to_left_berm * np.random.uniform(1.2, 2.2)
            ray_r[i] = dist_to_right_berm * np.random.uniform(1.8, 3.5)
            ray_fr[i] = dist_to_right_berm * np.random.uniform(1.2, 2.2)

        elif sc == 1:
            # Genuine In-Lane Obstacle (boulder, rockfall, machinery on road)
            d_obs = np.random.uniform(2.5, 48.0)
            ray_c[i] = d_obs
            ray_l[i] = min(dist_to_left_berm * 2.0, d_obs + np.random.uniform(3.0, 15.0))
            ray_r[i] = min(dist_to_right_berm * 2.0, d_obs + np.random.uniform(3.0, 15.0))
            ray_fl[i] = dist_to_left_berm * np.random.uniform(1.2, 2.2)
            ray_fr[i] = dist_to_right_berm * np.random.uniform(1.2, 2.2)

        elif sc == 2:
            # Truck is veering towards a road berm at an angle (run-off-road risk)
            veering_left = head < -10.0 or lat < -4.5
            if veering_left:
                # Approaching left berm
                d_berm_hit = max(2.0, dist_to_left_berm / max(0.15, np.sin(np.radians(abs(head) + 10))))
                ray_fl[i] = min(d_berm_hit * 0.8, 12.0)
                ray_l[i] = min(d_berm_hit * 0.9, 15.0)
                ray_c[i] = min(d_berm_hit, 35.0)
                ray_r[i] = np.random.uniform(30.0, 60.0)
                ray_fr[i] = np.random.uniform(35.0, 65.0)
            else:
                # Approaching right berm
                d_berm_hit = max(2.0, dist_to_right_berm / max(0.15, np.sin(np.radians(abs(head) + 10))))
                ray_fr[i] = min(d_berm_hit * 0.8, 12.0)
                ray_r[i] = min(d_berm_hit * 0.9, 15.0)
                ray_c[i] = min(d_berm_hit, 35.0)
                ray_l[i] = np.random.uniform(30.0, 60.0)
                ray_fl[i] = np.random.uniform(35.0, 65.0)

        elif sc == 3:
            # Navigating the circular loop curve (curved boundary ahead)
            d_curve = np.random.uniform(18.0, 42.0)
            ray_c[i] = d_curve
            ray_l[i] = d_curve + np.random.uniform(2.0, 10.0)
            ray_r[i] = d_curve + np.random.uniform(2.0, 10.0)
            ray_fl[i] = np.random.uniform(15.0, 35.0)
            ray_fr[i] = np.random.uniform(15.0, 35.0)

        elif sc == 4:
            # Imminent close collision (all front clearance critical)
            d_obs = np.random.uniform(1.0, 10.0)
            ray_c[i] = d_obs
            ray_l[i] = d_obs + np.random.uniform(-0.5, 1.5)
            ray_r[i] = d_obs + np.random.uniform(-0.5, 1.5)
            ray_fl[i] = d_obs + np.random.uniform(-0.5, 2.0)
            ray_fr[i] = d_obs + np.random.uniform(-0.5, 2.0)

    # 7. Ground Truth Physics & ADAS Decision Logic
    # 150-ton heavy mining truck braking parameters
    a_brake = 3.2  # m/s^2 deceleration
    t_react = 0.25  # seconds
    d_safe_stop = (speeds_ms * t_react) + ((speeds_ms ** 2) / (2.0 * a_brake)) + 2.5  # +2.5m safety margin

    y_risk = np.zeros(n_samples, dtype=np.int64)
    y_brake = np.zeros((n_samples, 1), dtype=np.float32)
    y_steer = np.zeros((n_samples, 1), dtype=np.float32)

    for i in range(n_samples):
        v = speeds_ms[i]
        d_center = ray_c[i]
        d_req = d_safe_stop[i]
        lat = lateral_offsets[i]

        # In-lane forward trajectory threat distance:
        # Side rays (20 deg) only register as in-lane threats if obstacle is inside lane clearance (<16.0m)
        fwd_threat_dist = min(
            d_center,
            ray_l[i] * 1.5 if ray_l[i] < 16.0 else 99.0,
            ray_r[i] * 1.5 if ray_r[i] < 16.0 else 99.0,
        )

        # Critical Condition: Obstacle inside forward stopping distance OR imminent collision zone (<5.0m)
        if (fwd_threat_dist <= d_req and v > 0.8) or (fwd_threat_dist < 6.5 and v > 1.0) or (fwd_threat_dist < 5.0):
            y_risk[i] = 2  # CRITICAL
            y_brake[i] = 1.0
        # Caution Condition: Obstacle in forward warning zone
        elif fwd_threat_dist <= (d_req * 1.8 + 6.0) and fwd_threat_dist < 42.0:
            y_risk[i] = 1  # CAUTION
            urgency = 1.0 - (fwd_threat_dist - d_req) / max((d_req * 1.0 + 6.0), 1e-3)
            y_brake[i] = float(np.clip(urgency * 0.5, 0.05, 0.6))
        else:
            # Safe: Road is clear
            y_risk[i] = 0  # SAFE
            y_brake[i] = 0.0

        # Safe Path Guidance Steering Delta
        left_clearance = (ray_fl[i] + ray_l[i] * 1.4) / 2.4
        right_clearance = (ray_fr[i] + ray_r[i] * 1.4) / 2.4

        # Room to steer within haul road boundaries (-9.6 to +9.6)
        left_lane_room = 8.5 + lat
        right_lane_room = 8.5 - lat

        if d_center < 40.0:
            # Need evasive steering around forward obstacle
            left_utility = left_clearance * min(left_lane_room / 4.0, 1.25)
            right_utility = right_clearance * min(right_lane_room / 4.0, 1.25)

            diff = (right_utility - left_utility) / max((right_utility + left_utility), 1e-3)
            suggested_steer = float(np.clip(diff * 2.0, -1.0, 1.0))
            y_steer[i] = suggested_steer
        else:
            # Road clear: gently guide truck towards road centerline (x = 0)
            center_guide = -float(lat / 7.5)
            y_steer[i] = float(np.clip(center_guide, -0.35, 0.35))

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
