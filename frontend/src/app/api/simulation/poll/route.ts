import { NextRequest, NextResponse } from "next/server";
import { 
  getState, 
  generateAgentComment 
} from "@/lib/mock-runtime";
import { AGENTS } from "@/lib/market-data";

export async function POST(request: NextRequest) {
  const state = getState();
  const tasks = state.tasks.filter((t) => t.status === "OPEN");
  
  if (tasks.length === 0) {
    return NextResponse.json({ success: false, message: "No open tasks" });
  }

  // Pick a random task
  const task = tasks[Math.floor(Math.random() * tasks.length)];
  
  // Pick from all registered agents
  const allAgents = state.agents.length > 0 ? state.agents : AGENTS;
  const agent = allAgents[Math.floor(Math.random() * allAgents.length)];

  console.log(`[Server Simulation] Agent ${agent.name} commenting on ${task.id}`);
  
  try {
    const comment = await generateAgentComment(task.id, agent.id);
    return NextResponse.json({ 
      success: true, 
      agent: agent.name, 
      task: task.id,
      comment: comment?.comment
    });
  } catch (error) {
    console.error("Simulation failed:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
