import { NextRequest, NextResponse } from "next/server";
import { config } from "@/lib/config";
import { pushEvent } from "@/lib/mock-runtime";
import { registerArmorIqAgentProfile } from "@/lib/integrations/armoriq";
import {
  ensureMarketplaceAgentsSynced,
  upsertSpacetimeAgentProfile,
} from "@/lib/integrations/spacetimedb";

const AGENT_REGISTRY_COLLECTION =
  "9W8MjmhBD6gcis6FTanAaBJu5SSWDp2wMrhX4BDhZMhv";

// Mock agent registration endpoint
// In production: Use Metaplex SDK to create NFT and store metadata

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      agentName,
      role,
      description,
      skills,
      baseRateSol,
      x402Endpoint,
      walletAddress,
    } = body;

    // Validate inputs
    if (!agentName || !role || !walletAddress || !x402Endpoint) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Mock: Simulate Metaplex NFT creation
    // In production: Actually create NFT on-chain
    const agentMint = `mock-mint-${Date.now()}`;
    const explorerUrl = `https://explorer.solana.com/address/${agentMint}?cluster=devnet`;

    // Store agent metadata in mock state
    const agentData = {
      id: agentMint,
      name: agentName,
      role,
      description,
      skills: skills || [],
      baseRateSol: Number(baseRateSol) || 0.05,
      x402Endpoint,
      wallet: walletAddress,
      registeredAt: new Date().toISOString(),
      collection: AGENT_REGISTRY_COLLECTION,
      explorerUrl,
    };

    // Event emission for dashboard
    pushEvent("agent.registered", {
      agent_id: agentMint,
      agent_name: agentName,
      role,
      message: `Agent ${agentName} registered on Metaplex Agent Registry`,
      explorer_url: explorerUrl,
    });

    const armoriq = await registerArmorIqAgentProfile({
      agentId: agentMint,
      name: agentName,
      role,
      skills: Array.isArray(skills) ? skills : [],
    });

    await ensureMarketplaceAgentsSynced();

    const spacetime = await upsertSpacetimeAgentProfile({
      agentId: agentMint,
      name: agentName,
      role,
      wallet: walletAddress,
      skills: Array.isArray(skills) ? skills : [],
      baseRateSol: Number(baseRateSol) || 0.05,
      canPostTasks: true,
      clawbotEndpoint: x402Endpoint,
      x402Endpoint,
      description:
        typeof description === "string" && description.trim().length > 0
          ? description.trim()
          : `${agentName} specializes in ${Array.isArray(skills) ? skills.join(", ") : "agent execution"}`,
      armoriqPolicyId: armoriq.profile.policyId,
      source: "agent-register-api",
    });

    pushEvent("armoriq.agent_profile_registered", {
      agent_id: agentMint,
      agent_name: agentName,
      mode: armoriq.mode,
      message: `ArmorIQ profile registered for ${agentName}`,
    });

    return NextResponse.json({
      success: true,
      agent: agentData,
      message: `Agent ${agentName} registered successfully on Metaplex`,
      explorerUrl,
      network: config.solanaCluster,
      armoriq: {
        enabled: config.armoriqEnabled,
        mode: armoriq.mode,
        policyId: armoriq.profile.policyId,
      },
      spacetime: {
        enabled: config.spacetimeEnabled,
        agentSynced: true,
        changed: spacetime.changed,
      },
    });
  } catch (error) {
    console.error("Agent registration failed:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Registration failed",
      },
      { status: 500 },
    );
  }
}

export async function GET() {
  // Return list of registered agents
  return NextResponse.json({
    registryCollection: AGENT_REGISTRY_COLLECTION,
    network: config.solanaCluster,
    message: "Agent Registry - Use POST to register new agents",
  });
}
