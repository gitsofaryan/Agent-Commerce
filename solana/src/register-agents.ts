import "dotenv/config";
import {
  clusterApiUrl,
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";

const AGENT_IDS = [
  "orchestrator",
  "researcher",
  "analyst",
  "executor",
  "support",
] as const;

function parseSecretFromEnv(envKey: string): Keypair | null {
  const raw = process.env[envKey];
  if (!raw) return null;

  try {
    const bytes = JSON.parse(raw) as number[];
    return Keypair.fromSecretKey(Uint8Array.from(bytes));
  } catch {
    return null;
  }
}

async function getBalance(connection: Connection, wallet: Keypair) {
  const lamports = await connection.getBalance(wallet.publicKey, "confirmed");
  return lamports / LAMPORTS_PER_SOL;
}

async function main() {
  const rpcUrl = process.env.SOLANA_RPC_URL || clusterApiUrl("devnet");
  const connection = new Connection(rpcUrl, "confirmed");

  console.log("Agentic Commerce Solana Register Script");
  console.log(`RPC: ${rpcUrl}`);
  console.log("----------------------------------------");

  for (const id of AGENT_IDS) {
    const envKey = `${id.toUpperCase()}_PRIVATE_KEY`;
    const wallet = parseSecretFromEnv(envKey);

    if (!wallet) {
      console.log(`[skip] ${id} - missing ${envKey}`);
      continue;
    }

    const balance = await getBalance(connection, wallet);
    console.log(
      `[ok]   ${id} ${wallet.publicKey.toBase58()} (${balance.toFixed(4)} SOL)`,
    );
  }

  console.log("----------------------------------------");
  console.log("Next step: wire Metaplex registration flow here.");
}

main().catch((err) => {
  console.error("register failed", err);
  process.exit(1);
});
