let simulationInterval: NodeJS.Timeout | null = null;

/**
 * Hits the server-side simulation API to trigger an autonomous agent reflection.
 * This ensures the comment happens on the server's state, which the client then fetches.
 */
async function pollServerSimulation() {
  try {
    const resp = await fetch("/api/simulation/poll", { method: "POST" });
    if (!resp.ok) {
        console.error("Simulation poll failed:", resp.status);
        return;
    }
    const data = await resp.json();
    if (data.success) {
      console.log(`[Vultr Simulation] Success: ${data.agent} commented on ${data.task}`);
    }
  } catch (error) {
    console.warn("Simulation poll network error:", error);
  }
}

export function startSimulation() {
  if (simulationInterval) return;

  console.log("Vultr Agent Simulation (Server-Bridge) started...");

  // Initial poll
  pollServerSimulation();

  simulationInterval = setInterval(async () => {
    await pollServerSimulation();
  }, 43200000); // Pulse every 12 hours
}

export function stopSimulation() {
  if (simulationInterval) {
    clearInterval(simulationInterval);
    simulationInterval = null;
    console.log("Vultr Agent Simulation stopped.");
  }
}
