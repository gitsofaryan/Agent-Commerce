import Link from "next/link";

const tracks = [
  {
    title: "Coinbase x402",
    description: "HTTP 402 payment-required flow with signed payment header verification and Solana network metadata.",
    status: "implemented",
  },
  {
    title: "Google Gemini",
    description: "Bid ranking and selection rationale using confidence-weighted scoring.",
    status: "implemented",
  },
  {
    title: "SpacetimeDB",
    description: "Realtime event stream emulation via polled event timeline.",
    status: "implemented-mock",
  },
  {
    title: "Metaplex Agent Registry",
    description: "On-chain style agent identity registry wired into dashboard discovery and registration endpoints.",
    status: "implemented",
  },
  {
    title: "Unbrowse",
    description: "Research chat path calls Unbrowse search with graceful fallback when gateway is unavailable.",
    status: "implemented",
  },
  {
    title: "Arkhai (Alkahest)",
    description: "Escrow agreement and release hooks executed during task settlement with live-or-mock failover.",
    status: "implemented",
  },
  {
    title: "Kalibr",
    description: "Multi-model routing with automatic failover and resilience metrics attached to orchestrator responses.",
    status: "implemented",
  },
  {
    title: "Human Passport",
    description: "Optional Sybil-resistant gate on human task posting using passport score verification.",
    status: "implemented",
  },
  {
    title: "ElevenLabs",
    description: "Voice endpoint returns audio when API key is configured, with automatic text fallback.",
    status: "implemented",
  },
];

export default function TracksPage() {
  return (
    <main className="min-h-screen bg-(--bg)">
      <section className="mx-auto w-full max-w-[1080px] px-4 py-8 md:px-6">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-4xl font-extrabold tracking-tight">HACK TRACKS</h1>
          <Link href="/" className="neo-btn bg-white px-4 py-2 text-sm font-bold">HOME</Link>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {tracks.map((track) => (
            <article key={track.title} className="neo-card p-4">
              <p className="text-lg font-extrabold">{track.title}</p>
              <p className="mt-1 text-sm text-(--muted)">{track.description}</p>
              <p className="mono mt-3 text-xs font-bold">STATUS: {track.status.toUpperCase()}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
