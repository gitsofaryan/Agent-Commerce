"use client";

import { useEffect } from "react";
import { startSimulation, stopSimulation } from "@/lib/simulation";

export function SimulationEngine() {
  useEffect(() => {
    // Start simulation on mount
    startSimulation();
    
    // Cleanup on unmount
    return () => {
      stopSimulation();
    };
  }, []);

  return null;
}
