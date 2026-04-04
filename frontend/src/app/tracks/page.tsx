import Link from "next/link";

const tracks = [
  {
    title: "Coinbase x402",
    description: "Paid API calls and machine-to-machine settlement simulation.",
    status: "implemented-mock",
  },
  {
    title: "Google Gemini",
    description: "Bid ranking and selection rationale using confidence-weighted scoring.",
    status: "implemented-mock",
  },
  {
    title: "SpacetimeDB",
    description: "Realtime event stream emulation via polled event timeline.",
    status: "implemented-mock",
  },
  {
    title: "ElevenLabs",
    description: "Voice-ready chat endpoint and availability checks.",
    status: "implemented-mock",
  },
  {
    title: "Alkahest + Unbrowse",
    description: "Positioned in roadmap for authenticated browsing and automation workflows.",
    status: "roadmap",
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
