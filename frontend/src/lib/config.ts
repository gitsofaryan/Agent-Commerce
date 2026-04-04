export type SolanaCluster = "devnet" | "testnet" | "mainnet-beta";

function parseCluster(value: string | undefined): SolanaCluster {
  const normalized = (value || "devnet").toLowerCase();
  if (normalized === "testnet") return "testnet";
  if (normalized === "mainnet" || normalized === "mainnet-beta")
    return "mainnet-beta";
  return "devnet";
}

export const config = {
  solanaCluster: parseCluster(
    process.env.NEXT_PUBLIC_SOLANA_NETWORK || process.env.SOLANA_NETWORK,
  ),
  solanaRpcUrl: process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com",
  unbrowseUrl: process.env.UNBROWSE_URL || "http://localhost:6969",
  x402Network: process.env.X402_NETWORK || "solana-devnet",
  elevenlabsApiKey: process.env.ELEVENLABS_API_KEY || "",
  elevenlabsVoiceId: process.env.ELEVENLABS_VOICE_ID || "21m00Tcm4TlvDq8ikWAM",
  humanPassportEnabled: process.env.HUMAN_PASSPORT_ENABLED === "true",
  humanPassportApiKey: process.env.HUMAN_PASSPORT_API_KEY || "",
  humanPassportScorerId: process.env.HUMAN_PASSPORT_SCORER_ID || "",
  humanPassportThreshold: Number(process.env.HUMAN_PASSPORT_THRESHOLD || "20"),

  vultrApiKey: process.env.VULTR_INFERENCE_API_KEY || "",
  vultrBaseUrl: process.env.VULTR_BASE_URL || "https://api.vultrinference.com/v1",
  vultrModelPrimary:
    process.env.VULTR_MODEL_PRIMARY || "MiniMaxAI/MiniMax-M2.5",
  vultrModelSecondary: process.env.VULTR_MODEL_SECONDARY || "moonshotai/Kimi-K2.5",
  vultrModelTertiary: process.env.VULTR_MODEL_TERTIARY || "zai-org/GLM-5-FP8",
  alkahestEnabled: process.env.ALKAHEST_ENABLED === "true",
  alkahestApiUrl: process.env.ALKAHEST_API_URL || "",
  alkahestApiKey: process.env.ALKAHEST_API_KEY || "",
  // Localhost default for development. TODO(vultr-deploy): set this via env to your Vultr public URL.
  spacetimeEnabled: (process.env.SPACETIMEDB_ENABLED || "true") === "true",
  // Local ingest endpoint while running SpacetimeDB locally.
  // TODO(vultr-deploy): replace with https://<your-vultr-domain-or-ip> endpoint.
  spacetimeApiUrl: process.env.SPACETIMEDB_API_URL || "http://127.0.0.1:3001",
  spacetimeApiKey: process.env.SPACETIMEDB_API_KEY || "",
  spacetimeDatabase: process.env.SPACETIMEDB_DATABASE || "agent_commerce",
  spacetimeModule: process.env.SPACETIMEDB_MODULE || "main",
  // Localhost default for ArmorIQ policy gateway. TODO(vultr-deploy): set to Vultr public HTTPS URL.
  armoriqEnabled: (process.env.ARMORIQ_ENABLED || "false") === "true",
  armoriqApiUrl: process.env.ARMORIQ_API_URL || "http://127.0.0.1:8787",
  armoriqApiKey: process.env.ARMORIQ_API_KEY || "",
  armoriqPolicyId: process.env.ARMORIQ_POLICY_ID || "agent-commerce-default",
};
