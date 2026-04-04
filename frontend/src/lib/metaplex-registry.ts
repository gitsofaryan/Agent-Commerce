import { Connection, PublicKey, clusterApiUrl } from "@solana/web3.js";
import { config } from "@/lib/config";

export interface AgentIdentity {
  address: string;
  name: string;
  role: string;
  description: string;
  metadata_uri?: string;
  verified: boolean;
  created_at: string;
}

export interface AgentRegistry {
  collection_id: string;
  agents: AgentIdentity[];
  last_updated: string;
}

// Metaplex Agent Registry Collection ID (from your project)
const AGENT_REGISTRY_COLLECTION =
  "9W8MjmhBD6gcis6FTanAaBJu5SSWDp2wMrhX4BDhZMhv";

// Mock agent registry for devnet
const MOCK_AGENT_IDENTITIES: AgentIdentity[] = [
  {
    address: "7Wj3...Vkp9",
    name: "ResearchAgent_7",
    role: "research",
    description: "Web search, data aggregation, market research",
    verified: true,
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    address: "F84q...R2aX",
    name: "ExecutorAgent_3",
    role: "execution",
    description: "Swap execution, LP positions, staking",
    verified: true,
    created_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    address: "B9Vk...2rdP",
    name: "AnalystAgent_12",
    role: "analysis",
    description: "Risk assessment, yield farming analysis",
    verified: true,
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    address: "DcA1...1zzQ",
    name: "AuditAgent_5",
    role: "security",
    description: "Smart contract audits, vulnerability scanning",
    verified: true,
    created_at: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    address: "3sfK...xM21",
    name: "DataAgent_9",
    role: "data",
    description: "ETL pipelines, data indexing, monitoring",
    verified: true,
    created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

export class MetaplexAgentRegistry {
  private connection: Connection;
  private collectionId: PublicKey;

  constructor(cluster: "mainnet-beta" | "testnet" | "devnet" = "devnet") {
    this.connection = new Connection(clusterApiUrl(cluster), "confirmed");
    this.collectionId = new PublicKey(AGENT_REGISTRY_COLLECTION);
  }

  /**
   * Get all registered agents from Metaplex collection
   */
  async getAllAgents(): Promise<AgentRegistry> {
    // In production, this would query the Metaplex API
    // For hackathon, we use mock data
    return {
      collection_id: AGENT_REGISTRY_COLLECTION,
      agents: MOCK_AGENT_IDENTITIES,
      last_updated: new Date().toISOString(),
    };
  }

  /**
   * Get agent metadata by address
   */
  async getAgentMetadata(agentAddress: string): Promise<AgentIdentity | null> {
    const agent = MOCK_AGENT_IDENTITIES.find(
      (a) => a.address.toLowerCase() === agentAddress.toLowerCase(),
    );
    return agent || null;
  }

  /**
   * Verify agent is registered and valid
   */
  async verifyAgent(agentAddress: string): Promise<boolean> {
    const agent = await this.getAgentMetadata(agentAddress);
    return agent?.verified || false;
  }

  /**
   * Get agent's x402 service endpoint
   */
  getAgentServiceEndpoint(agentAddress: string): string {
    return `https://agent.${agentAddress}.local/api/service`;
  }

  /**
   * Get agent's HTTP 402 payment requirements
   */
  async getPaymentRequirements(
    agentAddress: string,
    _service?: string,
  ): Promise<{
    status: number;
    recipient: string;
    amount: number;
    currency: string;
  }> {
    const agent = await this.getAgentMetadata(agentAddress);
    if (!agent) {
      throw new Error(`Agent ${agentAddress} not found in registry`);
    }

    return {
      status: 402,
      recipient: agentAddress,
      amount: 0.01, // SOL
      currency: "SOL",
    };
  }

  getConnection(): Connection {
    return this.connection;
  }
}

// Singleton instance
let registryInstance: MetaplexAgentRegistry | null = null;

export function getAgentRegistry(): MetaplexAgentRegistry {
  if (!registryInstance) {
    registryInstance = new MetaplexAgentRegistry(config.solanaCluster);
  }
  return registryInstance;
}
