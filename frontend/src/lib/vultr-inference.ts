// Vultr Inference API utility for Agent Commerce
// Uses API key from environment variable VULTR_INFERENCE_API_KEY

const VULTR_API_URL = 'https://api.vultrinference.com';

export async function callVultrInference(endpoint, body = {}, method = 'POST') {
  const apiKey = process.env.VULTR_INFERENCE_API_KEY;
  if (!apiKey) throw new Error('VULTR_INFERENCE_API_KEY not set');

  const res = await fetch(`${VULTR_API_URL}${endpoint}`, {
    method,
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: method === 'GET' ? undefined : JSON.stringify(body),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Vultr API error: ${res.status} ${error}`);
  }
  return res.json();
}
