import { config } from "./config";

const VULTR_API_URL = "https://api.vultrinference.com";

export async function callVultrInference(
  endpoint: string,
  body: Record<string, any> = {},
  method: string = "POST",
) {
  const apiKey = config.vultrApiKey;
  if (!apiKey) {
    console.warn("VULTR_INFERENCE_API_KEY not set, using mock response.");
    return { text: "Mock Vultr response (API key missing)" };
  }

  const res = await fetch(`${VULTR_API_URL}${endpoint}`, {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: method === "GET" ? undefined : JSON.stringify(body),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Vultr API error: ${res.status} ${error}`);
  }
  return res.json();
}
