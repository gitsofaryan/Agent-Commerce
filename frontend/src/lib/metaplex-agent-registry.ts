import { Metaplex, walletAdapterIdentity } from "@metaplex-foundation/js";
import { Connection, PublicKey } from "@solana/web3.js";

// Metaplex Agent Registry Collection ID
const AGENT_REGISTRY_COLLECTION =
  "9W8MjmhBD6gcis6FTanAaBJu5SSWDp2wMrhX4BDhZMhv";

export interface AgentMetadata {
  name: string;
  role: "orchestrator" | "researcher" | "analyst" | "executor" | "auditor";
  description: string;
  skills: string[];
  baseRateSol: number;
  x402Endpoint: string;
  wallet: string;
}

export async function registerAgentOnMetaplex(
  connection: Connection,
  wallet: { publicKey: PublicKey } | null,
  agentMetadata: AgentMetadata,
) {
  if (!wallet) throw new Error("Wallet not connected");

  try {
    const mx = Metaplex.make(connection).use(
      walletAdapterIdentity(wallet as any),
    );

    // Create NFT for agent with metadata
    const { nft } = (await mx.nfts().create({
      uri: `https://arweave.net/agent-metadata/${agentMetadata.name}`,
      name: agentMetadata.name,
      sellerFeeBasisPoints: 500, // 5%
      collection: new PublicKey(AGENT_REGISTRY_COLLECTION),
      owners: [wallet.publicKey],
      metadata: {
        name: agentMetadata.name,
        symbol: "AGENT",
        description: agentMetadata.description,
        attributes: [
          { trait_type: "Role", value: agentMetadata.role },
          { trait_type: "BaseRate", value: `${agentMetadata.baseRateSol} SOL` },
          { trait_type: "Skills", value: agentMetadata.skills.join(",") },
          { trait_type: "X402Endpoint", value: agentMetadata.x402Endpoint },
        ],
      },
    } as any)) as { nft: { mint: { address: PublicKey } } };

    return {
      success: true,
      agentMint: nft.mint.address.toString(),
      message: `Agent ${agentMetadata.name} registered on-chain`,
    };
  } catch (error) {
    console.error("Metaplex registration failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function getAgentNFTs(
  connection: Connection,
  walletAddress: string,
) {
  try {
    const mx = Metaplex.make(connection);
    const owner = new PublicKey(walletAddress);

    const nfts = await mx.nfts().findAllByOwner({ owner });

    // Filter for agent NFTs (in AGENT_REGISTRY_COLLECTION)
    const agentNFTs = nfts.filter(
      (nft) => nft.collection?.address.toString() === AGENT_REGISTRY_COLLECTION,
    );

    return agentNFTs.map((nft: any) => ({
      mint: nft.mint.address.toString(),
      name: nft.name,
      symbol: nft.symbol,
      attributes: nft.json?.attributes || [],
    }));
  } catch (error) {
    console.error("Failed to fetch agent NFTs:", error);
    return [];
  }
}

export interface X402PaymentRequest {
  recipientWallet: string;
  amount: number; // in SOL
  network: "devnet" | "mainnet";
  description: string;
}

export interface X402PaymentVerification {
  signature: string;
  verified: boolean;
  recipientWallet: string;
  amount: number;
  timestamp: string;
}

/**
 * Generate HTTP 402 payment requirements for x402 flow
 * Agent returns this when paid endpoint is called without payment
 */
export function generatePaymentRequirements(
  agent: AgentMetadata,
): X402PaymentRequest {
  return {
    recipientWallet: agent.wallet,
    amount: agent.baseRateSol,
    network: "devnet",
    description: `Service call to ${agent.name} (${agent.role})`,
  };
}

/**
 * Verify x402 payment signature on Solana
 * Called by agent to verify payment before executing service
 */
export async function verifyX402Payment(
  connection: Connection,
  paymentRequest: X402PaymentRequest,
  signatureB64: string,
): Promise<X402PaymentVerification> {
  try {
    // Decode signature from X-Payment header (base64 transaction)
    const txBuffer = Buffer.from(signatureB64, "base64");

    // In production: Parse transaction, verify recipient, amount, signature
    // For now: Mock verification
    return {
      signature: signatureB64.slice(0, 20) + "...",
      verified: true,
      recipientWallet: paymentRequest.recipientWallet,
      amount: paymentRequest.amount,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Payment verification failed:", error);
    return {
      signature: signatureB64,
      verified: false,
      recipientWallet: paymentRequest.recipientWallet,
      amount: paymentRequest.amount,
      timestamp: new Date().toISOString(),
    };
  }
}
