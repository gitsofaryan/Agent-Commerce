import { config } from "@/lib/config";

export interface KalibrResult {
  text: string;
  provider: string;
  model: string;
  attempts: number;
  failoverUsed: boolean;
  latencyMs: number;
}

const modelHealth = new Map<string, { success: number; failure: number }>();

function markHealth(model: string, ok: boolean) {
  const row = modelHealth.get(model) || { success: 0, failure: 0 };
  if (ok) row.success += 1;
  else row.failure += 1;
  modelHealth.set(model, row);
}

async function callVultrCompat(
  model: string,
  prompt: string,
): Promise<string> {
  const response = await fetch(`${config.vultrBaseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.vultrApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content:
            "You are the AgentCommerce orchestrator. Keep responses concise and practical.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.4,
    }),
  });

  if (!response.ok) {
    throw new Error(`Vultr error: ${response.status}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  return data.choices?.[0]?.message?.content?.trim() || "";
}

function deterministicFallback(prompt: string): string {
  return `Orchestrator route fallback: received "${prompt.slice(0, 180)}". I can run research, bidding, selection, and x402 settlement on Solana.`;
}

export async function kalibrRoute(
  prompt: string,
  modelOverride?: string,
): Promise<KalibrResult> {
  const models = modelOverride
    ? [
        modelOverride,
        config.vultrModelPrimary,
        config.vultrModelSecondary,
        config.vultrModelTertiary,
      ]
    : [
        config.vultrModelPrimary,
        config.vultrModelSecondary,
        config.vultrModelTertiary,
      ];

  const startedAt = Date.now();

  if (!config.vultrApiKey) {
    return {
      text: deterministicFallback(prompt),
      provider: "kalibr-mock",
      model: "fallback",
      attempts: 1,
      failoverUsed: false,
      latencyMs: Date.now() - startedAt,
    };
  }

  let attempts = 0;
  for (const model of models) {
    attempts += 1;
    try {
      const text = await callVultrCompat(model, prompt);
      markHealth(model, true);
      return {
        text: text || deterministicFallback(prompt),
        provider: "vultr-inference",
        model,
        attempts,
        failoverUsed: attempts > 1,
        latencyMs: Date.now() - startedAt,
      };
    } catch {
      markHealth(model, false);
    }
  }

  return {
    text: deterministicFallback(prompt),
    provider: "kalibr-fallback",
    model: "fallback",
    attempts,
    failoverUsed: true,
    latencyMs: Date.now() - startedAt,
  };
}

export function kalibrHealth() {
  return {
    enabled: true,
    vultrConfigured: !!config.vultrApiKey,
    models: {
      vultr: [
        config.vultrModelPrimary,
        config.vultrModelSecondary,
        config.vultrModelTertiary,
      ],
    },
    stats: Object.fromEntries(modelHealth.entries()),
  };
}
