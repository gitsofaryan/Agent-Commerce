import { NextResponse } from "next/server";
import { config } from "@/lib/config";
import { humanPassportStatus } from "@/lib/integrations/human-passport";
import { kalibrHealth } from "@/lib/integrations/kalibr";
import { unbrowseHealth } from "@/lib/integrations/unbrowse";
import { isVoiceAvailable } from "@/lib/integrations/elevenlabs";
import { spacetimeHealth } from "@/lib/integrations/spacetimedb";
import { armorIqHealth } from "@/lib/integrations/armoriq";

export async function GET() {
  const unbrowseOk = await unbrowseHealth();

  return NextResponse.json({
    ok: true,
    service: "agent-commerce-mock",
    mode: "ecosystem-integrated",
    timestamp: new Date().toISOString(),
    network: {
      solana_cluster: config.solanaCluster,
      solana_rpc: config.solanaRpcUrl,
      x402_network: config.x402Network,
    },
    integrations: {
      metaplex_registry: true,
      x402_payments: true,
      unbrowse: { reachable: unbrowseOk },
      alkahest: { enabled: config.alkahestEnabled },
      kalibr: kalibrHealth(),
      human_passport: humanPassportStatus(),
      elevenlabs: {
        available: isVoiceAvailable(),
      },
      spacetimedb: spacetimeHealth(),
      armoriq: armorIqHealth(),
    },
  });
}
