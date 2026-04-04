import { config } from "@/lib/config";

const PASSPORT_API_BASE = "https://api.passport.xyz";

interface PassportScore {
  score: string;
  passing_score: boolean;
  threshold: string;
  error: string | null;
}

export async function getPassportScore(
  address: string,
): Promise<PassportScore | null> {
  if (!config.humanPassportApiKey || !config.humanPassportScorerId) {
    return null;
  }

  const response = await fetch(
    `${PASSPORT_API_BASE}/v2/stamps/${config.humanPassportScorerId}/score/${address}`,
    {
      headers: { "X-API-KEY": config.humanPassportApiKey },
    },
  );

  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error(`Human Passport API error: ${response.status}`);
  }

  return response.json();
}

export async function verifyHuman(walletAddress: string): Promise<boolean> {
  if (!config.humanPassportEnabled) return true;

  if (!config.humanPassportApiKey || !config.humanPassportScorerId) {
    return false;
  }

  const score = await getPassportScore(walletAddress);
  if (!score) return false;
  if (score.error) return false;

  return score.passing_score;
}

export function humanPassportStatus() {
  return {
    enabled: config.humanPassportEnabled,
    configured: !!(config.humanPassportApiKey && config.humanPassportScorerId),
    threshold: config.humanPassportThreshold,
  };
}
