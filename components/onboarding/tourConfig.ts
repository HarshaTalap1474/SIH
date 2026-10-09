import { TourStepConfig } from "./types";

export const TOUR_STEPS: TourStepConfig[] = [
  {
    id: "step-sidebar",
    stepNumber: 1,
    totalSteps: 7,
    targetSelector: '[data-tour="fleet-sidebar"]',
    title: "Fleet Navigation",
    description:
      "Use the navigation panel to move between fleet monitoring, live tracking, alerts, analytics, reports, device management and other control-room features.",
    placement: "right",
    highlightPadding: 4,
    badgeText: "Navigation",
  },
  {
    id: "step-kpis",
    stepNumber: 2,
    totalSteps: 7,
    targetSelector: '[data-tour="kpi-cards"]',
    title: "Fleet Overview",
    description:
      "Monitor the overall health of your HEMM fleet at a glance, including active vehicles, alerts, distance, average speed and system uptime.",
    placement: "bottom",
    highlightPadding: 6,
    badgeText: "KPIs",
  },
  {
    id: "step-fleet-map",
    stepNumber: 3,
    totalSteps: 7,
    targetSelector: '[data-tour="fleet-map"]',
    title: "Live Fleet Tracking",
    description:
      "Monitor HEMM vehicles in real time across the mine site. Vehicle markers indicate their current status and location. You can select any vehicle directly from the map.",
    placement: "bottom",
    highlightPadding: 6,
    badgeText: "Map View",
  },
  {
    id: "step-select-vehicle",
    stepNumber: 4,
    totalSteps: 7,
    targetSelector: '[data-tour="vehicle-marker-d03"]',
    title: "Select a HEMM",
    description:
      "Select any vehicle to view its detailed telemetry, sensor status, alerts and live cabin preview. Marker D-03 is highlighted as an active operational example.",
    interactiveHint: "Click D-03 marker or click Next to open details",
    placement: "right",
    highlightPadding: 10,
    badgeText: "HEMM Marker",
  },
  {
    id: "step-vehicle-details",
    stepNumber: 5,
    totalSteps: 7,
    targetSelector: '[data-tour="vehicle-details-panel"]',
    title: "Vehicle Details",
    description:
      "View detailed information for the selected HEMM, including speed, clearance, TTC, heading, power and current status.",
    placement: "left",
    highlightPadding: 6,
    badgeText: "Telemetry",
  },
  {
    id: "step-sensor-status",
    stepNumber: 6,
    totalSteps: 7,
    targetSelector: '[data-tour="sensor-status"]',
    title: "Sensor Health",
    description:
      "Monitor the health of the vehicle's Camera, LiDAR, Radar, GPS, ESP32 and AI Model.",
    placement: "left",
    highlightPadding: 6,
    badgeText: "Sensors",
    scrollTargetIntoView: true,
  },
  {
    id: "step-cabin-preview",
    stepNumber: 7,
    totalSteps: 7,
    targetSelector: '[data-tour="cabin-preview"]',
    title: "Live Cabin",
    description:
      "Preview the selected HEMM's live cabin environment. Click the preview to enter the full Live Cabin experience.",
    interactiveHint: "Hover over preview to reveal 'Open Live Cabin →'",
    placement: "left",
    highlightPadding: 6,
    badgeText: "3D Cabin",
    scrollTargetIntoView: true,
  },
];
