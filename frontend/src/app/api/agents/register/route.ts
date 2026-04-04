import { Connection, PublicKey, clusterApiUrl } from "@solana/web3.js";
import { NextRequest, NextResponse } from "next/server";
import { config } from "@/lib/config";
import { pushEvent } from "@/lib/mock-runtime";

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

    return NextResponse.json({
      success: true,
      agent: agentData,
      message: `Agent ${agentName} registered successfully on Metaplex`,
      explorerUrl,
      network: config.solanaCluster,
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
