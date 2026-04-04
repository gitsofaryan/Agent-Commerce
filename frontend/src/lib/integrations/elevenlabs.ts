import { config } from "@/lib/config";

export function isVoiceAvailable(): boolean {
  return !!config.elevenlabsApiKey;
}

export async function textToSpeech(text: string): Promise<ArrayBuffer | null> {
  if (!config.elevenlabsApiKey) return null;

  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${config.elevenlabsVoiceId}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": config.elevenlabsApiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: text.slice(0, 3000),
          model_id: "eleven_monolingual_v1",
          voice_settings: { stability: 0.5, similarity_boost: 0.75 },
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`ElevenLabs API error: ${response.status}`);
    }

    return response.arrayBuffer();
  } catch {
    return null;
  }
}
