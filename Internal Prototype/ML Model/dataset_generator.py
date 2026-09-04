"""
Map-Aware Synthetic Haul-Road Encounter Dataset Generator for TinyML Training
Accurately models the Bailadila open-cast mine haul road (18.0m width, side berms, boulders, machinery).
Prevents false-positive threats from parallel road berms while strictly capturing genuine in-lane hazards.
"""

import numpy as np


def generate_haul_road_dataset(n_samples: int = 200000, seed: int = 42):
    """
    Generate synthetic dataset of vehicle telemetry and obstacle raycasts
    specifically aligned with the 3D mine site haul road map geometry (18m width).
    """
    np.random.seed(seed)

    # 1. Speeds (0 to 65 km/h for heavy mine dumpers, covering normal and boost mode)
    speeds_kmh = np.random.uniform(0.0, 60.0, size=n_samples).astype(np.float32)
    speeds_ms = speeds_kmh / 3.6

    # 2. Steering angles (-1.0 hard left to 1.0 hard right)
    steer_angles = np.random.uniform(-0.6, 0.6, size=n_samples).astype(np.float32)

    # 3. Lateral offset from road center (-7.8m left to +7.8m right)
    # Haul road is 18.0m wide (-9.0m left berm to +9.0m right berm, edge lines at +/-8.4m)
    lateral_offsets = np.random.uniform(-7.8, 7.8, size=n_samples).astype(np.float32)

    # 4. Heading angle relative to the road centerline (-40 deg to +40 deg)
    heading_deg = np.random.uniform(-35.0, 35.0, size=n_samples).astype(np.float32)

    # 5. Rear sensor rays (clearance behind truck)
    rays_rear = np.random.uniform(4.0, 80.0, size=n_samples).astype(np.float32)

    # 6. Scenario Distribution (200,000 scenarios):
    #   0: Normal In-Lane Cruising (Road is clear, parallel berms at sides) -> 42%
    #   1: In-Lane Obstacle (Boulder / Stopped Equipment directly ahead) -> 25%
    #   2: Road Boundary Deviation (Truck steering towards left/right berm) -> 18%
    #   3: Curve & Turning Navigation (Curving road corridor) -> 8%
    #   4: High-Speed Imminent Crash (Close-proximity emergency) -> 7%
    scenarios = np.random.choice([0, 1, 2, 3, 4], size=n_samples, p=[0.42, 0.25, 0.18, 0.08, 0.07])

    ray_fl = np.zeros(n_samples, dtype=np.float32)
    ray_l = np.zeros(n_samples, dtype=np.float32)
    ray_c = np.zeros(n_samples, dtype=np.float32)
    ray_r = np.zeros(n_samples, dtype=np.float32)
    ray_fr = np.zeros(n_samples, dtype=np.float32)

    for i in range(n_samples):
        sc = scenarios[i]
        lat = lateral_offsets[i]
        head = heading_deg[i]

        # Natural geometric clearance to straight road berms at x = -9.0m and +9.0m
        dist_to_left_berm = max(1.0, 9.0 + lat)
        dist_to_right_berm = max(1.0, 9.0 - lat)

        if sc == 0:
            # Normal in-lane cruising: Forward path is completely clear (>55m).
            # Side rays detect the parallel side berms at normal road width (6 - 18m), which is SAFE.
            ray_c[i] = np.random.uniform(55.0, 85.0)
            ray_l[i] = dist_to_left_berm * np.random.uniform(1.8, 3.2)
            ray_fl[i] = dist_to_left_berm * np.random.uniform(1.2, 2.0)
            ray_r[i] = dist_to_right_berm * np.random.uniform(1.8, 3.2)
            ray_fr[i] = dist_to_right_berm * np.random.uniform(1.2, 2.0)

        elif sc == 1:
            # Genuine In-Lane Obstacle (boulder, rockfall, stationary machinery on haul road)
            d_obs = np.random.uniform(2.5, 48.0)
            ray_c[i] = d_obs
            ray_l[i] = min(dist_to_left_berm * 2.0, d_obs + np.random.uniform(2.0, 12.0))
            ray_r[i] = min(dist_to_right_berm * 2.0, d_obs + np.random.uniform(2.0, 12.0))
            ray_fl[i] = dist_to_left_berm * np.random.uniform(1.2, 2.0)
            ray_fr[i] = dist_to_right_berm * np.random.uniform(1.2, 2.0)

        elif sc == 2:
            # Truck is veering towards a road berm at an angle (run-off-road risk)
            veering_left = head < -8.0 or lat < -4.0
            if veering_left:
                # Approaching left berm
                d_berm_hit = max(2.0, dist_to_left_berm / max(0.15, np.sin(np.radians(abs(head) + 10))))
                ray_fl[i] = min(d_berm_hit * 0.8, 12.0)
                ray_l[i] = min(d_berm_hit * 0.9, 15.0)
                ray_c[i] = min(d_berm_hit, 35.0)
                ray_r[i] = np.random.uniform(25.0, 55.0)
                ray_fr[i] = np.random.uniform(30.0, 60.0)
            else:
                # Approaching right berm
                d_berm_hit = max(2.0, dist_to_right_berm / max(0.15, np.sin(np.radians(abs(head) + 10))))
                ray_fr[i] = min(d_berm_hit * 0.8, 12.0)
                ray_r[i] = min(d_berm_hit * 0.9, 15.0)
                ray_c[i] = min(d_berm_hit, 35.0)
                ray_l[i] = np.random.uniform(25.0, 55.0)
                ray_fl[i] = np.random.uniform(30.0, 60.0)

        elif sc == 3:
            # Navigating curved road corridor / turnaround
            d_curve = np.random.uniform(16.0, 42.0)
            ray_c[i] = d_curve
            ray_l[i] = d_curve + np.random.uniform(2.0, 8.0)
            ray_r[i] = d_curve + np.random.uniform(2.0, 8.0)
            ray_fl[i] = np.random.uniform(14.0, 32.0)
            ray_fr[i] = np.random.uniform(14.0, 32.0)

        elif sc == 4:
            # Imminent close collision (all front clearance critical)
            d_obs = np.random.uniform(1.0, 9.0)
            ray_c[i] = d_obs
            ray_l[i] = d_obs + np.random.uniform(-0.4, 1.2)
            ray_r[i] = d_obs + np.random.uniform(-0.4, 1.2)
            ray_fl[i] = d_obs + np.random.uniform(-0.4, 1.8)
            ray_fr[i] = d_obs + np.random.uniform(-0.4, 1.8)

    # 7. Ground Truth Physics & ADAS Decision Logic
    # 150-ton heavy mining truck braking parameters
    a_brake = 3.2  # m/s^2 deceleration
    t_react = 0.25  # seconds reaction delay
    d_safe_stop = (speeds_ms * t_react) + ((speeds_ms ** 2) / (2.0 * a_brake)) + 2.5  # +2.5m buffer

    y_risk = np.zeros(n_samples, dtype=np.int64)
    y_brake = np.zeros((n_samples, 1), dtype=np.float32)
    y_steer = np.zeros((n_samples, 1), dtype=np.float32)

    for i in range(n_samples):
        v = speeds_ms[i]
        d_center = ray_c[i]
        d_req = d_safe_stop[i]
        lat = lateral_offsets[i]

        # In-lane forward trajectory threat distance:
        # Side rays (20 deg) only register as in-lane threats if obstacle is inside lane clearance (<15.0m)
        fwd_threat_dist = min(
            d_center,
            ray_l[i] * 1.5 if ray_l[i] < 15.0 else 99.0,
            ray_r[i] * 1.5 if ray_r[i] < 15.0 else 99.0,
        )

        # Critical Condition: Obstacle inside stopping distance OR imminent proximity (<5.0m)
        if (fwd_threat_dist <= d_req and v > 0.8) or (fwd_threat_dist < 6.5 and v > 1.0) or (fwd_threat_dist < 4.8):
            y_risk[i] = 2  # CRITICAL
            y_brake[i] = 1.0
        # Caution Condition: Obstacle in forward warning zone
        elif fwd_threat_dist <= (d_req * 1.7 + 6.0) and fwd_threat_dist < 45.0:
            y_risk[i] = 1  # CAUTION
            urgency = 1.0 - (fwd_threat_dist - d_req) / max((d_req * 0.9 + 6.0), 1e-3)
            y_brake[i] = float(np.clip(urgency * 0.5, 0.05, 0.55))
        else:
            # Safe: Road is clear
            y_risk[i] = 0  # SAFE
            y_brake[i] = 0.0

        # Safe Path Guidance Steering Delta
        left_clearance = (ray_fl[i] + ray_l[i] * 1.4) / 2.4
        right_clearance = (ray_fr[i] + ray_r[i] * 1.4) / 2.4

        # Available space within 18m haul road boundaries (-9.0 to +9.0)
        left_lane_room = 8.0 + lat
        right_lane_room = 8.0 - lat

        if d_center < 42.0:
            # Evasive steering recommendation around forward obstacle
            left_utility = left_clearance * min(left_lane_room / 4.0, 1.25)
            right_utility = right_clearance * min(right_lane_room / 4.0, 1.25)

            diff = (right_utility - left_utility) / max((right_utility + left_utility), 1e-3)
            suggested_steer = float(np.clip(diff * 2.0, -1.0, 1.0))
            y_steer[i] = suggested_steer
        else:
            # Road clear: gently guide truck towards road centerline (x = 0)
            center_guide = -float(lat / 7.5)
            y_steer[i] = float(np.clip(center_guide, -0.3, 0.3))

    # Assemble X feature matrix (9 inputs)
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
