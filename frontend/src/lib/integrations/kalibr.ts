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

async function callOpenAICompat(
  model: string,
  prompt: string,
): Promise<string> {
  const response = await fetch(`${config.llmBaseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.llmApiKey}`,
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
    throw new Error(`LLM error: ${response.status}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  return data.choices?.[0]?.message?.content?.trim() || "";
}

async function callGemini(model: string, prompt: string): Promise<string> {
  const response = await fetch(
    `${config.geminiBaseUrl}/models/${model}:generateContent?key=${config.geminiApiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 512,
        },
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`Gemini error: ${response.status}`);
  }

  const data = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };

  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
}

function deterministicFallback(prompt: string): string {
  return `Orchestrator route fallback: received \"${prompt.slice(0, 180)}\". I can run research, bidding, selection, and x402 settlement on Solana.`;
}

export async function kalibrRoute(prompt: string): Promise<KalibrResult> {
  const geminiModels = [config.geminiModelPrimary, config.geminiModelSecondary];
  const openAiModels = [
    config.llmModelPrimary,
    config.llmModelSecondary,
    config.llmModelTertiary,
  ];

  const startedAt = Date.now();

  if (!config.geminiApiKey && !config.llmApiKey) {
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
  if (config.geminiApiKey) {
    for (const model of geminiModels) {
      attempts += 1;
      try {
        const text = await callGemini(model, prompt);
        markHealth(model, true);
        return {
          text: text || deterministicFallback(prompt),
          provider: "kalibr-gemini",
          model,
          attempts,
          failoverUsed: attempts > 1,
          latencyMs: Date.now() - startedAt,
        };
      } catch {
        markHealth(model, false);
      }
    }
  }

  if (config.llmApiKey) {
    for (const model of openAiModels) {
      attempts += 1;
      try {
        const text = await callOpenAICompat(model, prompt);
        markHealth(model, true);
        return {
          text: text || deterministicFallback(prompt),
          provider: "kalibr-openai",
          model,
          attempts,
          failoverUsed: attempts > 1,
          latencyMs: Date.now() - startedAt,
        };
      } catch {
        markHealth(model, false);
      }
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
    geminiConfigured: !!config.geminiApiKey,
    openAiConfigured: !!config.llmApiKey,
    models: {
      gemini: [config.geminiModelPrimary, config.geminiModelSecondary],
      openai: [
        config.llmModelPrimary,
        config.llmModelSecondary,
        config.llmModelTertiary,
      ],
    },
    stats: Object.fromEntries(modelHealth.entries()),
  };
}
