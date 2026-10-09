"use client";

import { create } from "zustand";
import { TourStage } from "./types";
import { TOUR_STEPS } from "./tourConfig";
import { useFleetStore } from "@/lib/fleetStore";

const STORAGE_KEY = "webuildz_fleet_onboarding_completed";

interface TourState {
  stage: TourStage;
  currentStepIndex: number;
  isOpen: boolean;
  hasCheckedStorage: boolean;

  // Actions
  initializeTour: () => void;
  startTour: () => void;
  skipTour: () => void;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (index: number) => void;
  completeTour: () => void;
  restartTour: () => void;
  ensureTargetVisible: (stepIndex: number) => void;
}

export const useTourStore = create<TourState>((set, get) => ({
  stage: "idle",
  currentStepIndex: 0,
  isOpen: false,
  hasCheckedStorage: false,

  initializeTour: () => {
    if (typeof window === "undefined") return;
    try {
      const isCompleted = localStorage.getItem(STORAGE_KEY) === "true";
      if (!isCompleted) {
        set({
          stage: "welcome",
          isOpen: true,
          currentStepIndex: 0,
          hasCheckedStorage: true,
        });
      } else {
        set({
          stage: "idle",
          isOpen: false,
          hasCheckedStorage: true,
        });
      }
    } catch {
      set({
        stage: "idle",
        isOpen: false,
        hasCheckedStorage: true,
      });
    }
  },

  ensureTargetVisible: (stepIndex: number) => {
    const fleetStore = useFleetStore.getState();
    // Always ensure dashboard view is active
    if (fleetStore.activeNav !== "Dashboard") {
      fleetStore.setActiveNav("Dashboard");
    }

    // Steps 5, 6, 7 require the Vehicle Details Panel to be open
    // (step indices 4, 5, 6)
    if (stepIndex >= 4) {
      if (!fleetStore.selectedVehicleId || !fleetStore.isDetailsOpen) {
        fleetStore.selectVehicle("D-03");
      }
    }
  },

  startTour: () => {
    const { ensureTargetVisible } = get();
    ensureTargetVisible(0);
    set({
      stage: "tour",
      currentStepIndex: 0,
      isOpen: true,
    });
  },

  skipTour: () => {
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY, "true");
      }
    } catch {
      // storage unavailable
    }
    set({
      stage: "idle",
      isOpen: false,
    });
  },

  nextStep: () => {
    const { currentStepIndex, ensureTargetVisible } = get();
    const nextIndex = currentStepIndex + 1;

    if (nextIndex < TOUR_STEPS.length) {
      ensureTargetVisible(nextIndex);
      set({
        currentStepIndex: nextIndex,
      });
    } else {
      // Completed all 7 steps -> final confirmation screen
      set({
        stage: "completed",
      });
    }
  },

  prevStep: () => {
    const { currentStepIndex, ensureTargetVisible } = get();
    if (currentStepIndex > 0) {
      const prevIndex = currentStepIndex - 1;
      ensureTargetVisible(prevIndex);
      set({
        currentStepIndex: prevIndex,
      });
    }
  },

  goToStep: (index: number) => {
    const { ensureTargetVisible } = get();
    if (index >= 0 && index < TOUR_STEPS.length) {
      ensureTargetVisible(index);
      set({
        currentStepIndex: index,
        stage: "tour",
        isOpen: true,
      });
    }
  },

  completeTour: () => {
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY, "true");
      }
    } catch {
      // storage unavailable
    }
    set({
      stage: "idle",
      isOpen: false,
    });
  },

  restartTour: () => {
    const fleetStore = useFleetStore.getState();
    if (fleetStore.activeNav !== "Dashboard") {
      fleetStore.setActiveNav("Dashboard");
    }
    set({
      stage: "welcome",
      currentStepIndex: 0,
      isOpen: true,
    });
  },
}));
