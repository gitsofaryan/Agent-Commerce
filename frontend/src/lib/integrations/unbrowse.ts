import { config } from "@/lib/config";

const UNBROWSE_BASE = () => config.unbrowseUrl || "http://localhost:6969";

export async function unbrowseSearch(
  intent: string,
  domain?: string,
): Promise<Record<string, unknown>> {
  const path = domain ? "/v1/search/domain" : "/v1/search";
  const body: Record<string, unknown> = { intent, k: 5 };
  if (domain) body.domain = domain;

  const response = await fetch(`${UNBROWSE_BASE()}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Unbrowse search error: ${response.status}`);
  }

  return response.json();
}

export async function unbrowseHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${UNBROWSE_BASE()}/health`);
    if (!response.ok) return false;
    const data = (await response.json()) as { status?: string };
    return data.status === "ok";
  } catch {
    return false;
  }
}
