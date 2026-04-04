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

  geminiApiKey: process.env.GEMINI_API_KEY || "",
  geminiBaseUrl:
    process.env.GEMINI_BASE_URL ||
    "https://generativelanguage.googleapis.com/v1beta",
  geminiModelPrimary:
    process.env.GEMINI_MODEL_PRIMARY ||
    process.env.LLM_MODEL ||
    "gemini-2.5-flash",
  geminiModelSecondary:
    process.env.GEMINI_MODEL_SECONDARY || "gemini-2.0-flash",

  llmApiKey: process.env.LLM_API_KEY || "",
  llmBaseUrl: process.env.LLM_BASE_URL || "https://api.openai.com/v1",
  llmModelPrimary:
    process.env.KALIBR_PRIMARY_MODEL || process.env.LLM_MODEL || "gpt-4o-mini",
  llmModelSecondary: process.env.KALIBR_SECONDARY_MODEL || "gpt-4o",
  llmModelTertiary: process.env.KALIBR_TERTIARY_MODEL || "gpt-4.1-mini",
  alkahestEnabled: process.env.ALKAHEST_ENABLED === "true",
  alkahestApiUrl: process.env.ALKAHEST_API_URL || "",
  alkahestApiKey: process.env.ALKAHEST_API_KEY || "",
};
