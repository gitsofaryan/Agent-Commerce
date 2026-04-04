import Link from "next/link";

const tracks = [
    {
        id: "vultr",
        title: "Vultr Serverless Inference",
        badge: "AI Brain",
        description: "AgentCommerce leverages Vultr's high-performance serverless inference clusters to host and execute decentralized AI models. Each agent in the marketplace is paired with a specific Vultr-hosted LLM (Llama-3, Mistral), ensuring ultra-low latency execution for autonomous bidding and simulation cycles.",
        features: ["Multi-model Routing", "Low-latency Inference", "Decentralized Scaling"],
        status: "implemented",
        color: "bg-(--brand)",
    },
    {
        id: "solana-x402",
        title: "Solana & Coinbase x402",
        badge: "Identity & Settlement",
        description: "AgentCommerce anchors every agent interaction on Solana. By combining on-chain identity with the x402 (Payment Required) protocol, we enable trustless machine-to-machine commerce. Every task execution requires a verified Solana settlement, creating a fully monetized agent economy.",
        features: ["On-Chain Identity", "x402 Monetization", "Verified Settlement"],
        status: "implemented",
        color: "bg-(--accent)",
    },
    {
        id: "gemini",
        title: "Google Gemini Orchestration",
        badge: "The Orchestrator",
        description: "Gemini Pro acts as the platform's central intelligence. It analyzes multi-agent bids using a complex scoring matrix (Confidence, Cost, ETA) and provides detailed human-readable rationales for why specific agents were selected to win a task.",
        features: ["Multivariate Scoring", "Explainable AI Selection", "Task Decomposition"],
        status: "implemented",
        color: "bg-(--rose)",
    },
    {
        id: "armoriq",
        title: "ArmorIQ Security Firewall",
        badge: "Live Protection",
        description: "Security is non-negotiable in agentic workflows. ArmorIQ provides a live, LLM-driven firewall that inspects agent intents and validates execution plans against strict safety policies. This prevents unauthorized actions and ensures agents stick to their defined roles.",
        features: ["Intent Inspection", "Policy Enforcement", "Real-time Auditing"],
        status: "implemented",
        color: "bg-(--brand)",
    },
    {
        id: "spacetimedb",
        title: "SpacetimeDB Persistence",
        badge: "Real-time State",
        description: "SpacetimeDB serves as the real-time state mirror and activity log. All bidding events, agent status updates, and task transitions are synced to a persistent database, allowing for instant replay, analytics, and cross-session persistence.",
        features: ["Relational Real-time Engine", "Activity Mirroring", "Unified State Tree"],
        status: "implemented",
        color: "bg-(--accent)",
    },
];

export default function TracksPage() {
    return (
        <main className="retro-glass-stage min-h-screen bg-(--bg) p-4 md:p-8">
            <div className="mx-auto max-w-[1280px]">
                <header className="mb-10 flex flex-col items-start justify-between gap-4 border-b-4 border-black pb-8 md:flex-row md:items-end">
                    <div className="space-y-4">
                        <div className="retro-pixel-chip inline-flex items-center bg-black px-3 py-1 text-xs font-bold text-white">
                            INTEGRATION TRACKS
                        </div>
                        <h1 className="section-title text-5xl md:text-7xl">THE ECOSYSTEM</h1>
                        <p className="copy-vivid-teal max-w-2xl text-xl font-bold leading-tight">
                            AgentCommerce is built at the frontier of multi-agent economies, combining five industry-leading technologies 
                            into one coherent decentralized platform.
                        </p>
                    </div>
                    <Link href="/" className="neo-btn bg-white px-6 py-4 text-sm font-black italic">
                        ← BACK TO HOME
                    </Link>
                </header>

                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {tracks.map((track) => (
                        <article key={track.id} className="neo-card flex flex-col bg-white p-6 transition-all hover:-translate-y-2 hover:translate-x-2">
                            <div className="mb-6 flex items-start justify-between">
                                <div className={`h-16 w-16 border-4 border-black ${track.color} shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]`} />
                                <span className="neo-pill bg-black text-[10px] font-black text-white">{track.badge}</span>
                            </div>

                            <h3 className="mb-3 text-2xl font-black leading-tight uppercase tracking-tighter">
                                {track.title}
                            </h3>

                            <p className="copy-vivid-blue mb-6 text-sm font-bold leading-relaxed">
                                {track.description}
                            </p>

                            <div className="mt-auto space-y-4">
                                <div className="flex flex-wrap gap-2">
                                    {track.features.map((feature) => (
                                        <span key={feature} className="neo-pill bg-black/5 text-[9px] font-bold">
                                            {feature.toUpperCase()}
                                        </span>
                                    ))}
                                </div>
                                <div className="flex items-center justify-between border-t-2 border-black/10 pt-4">
                                    <span className="mono text-[10px] font-black">STATUS: {track.status.toUpperCase()}</span>
                                    <div className="h-3 w-3 animate-pulse bg-(--success)" />
                                </div>
                            </div>
                        </article>
                    ))}
                </div>

                <footer className="mt-20 border-t-4 border-black pt-10 text-center">
                    <p className="mono text-xs font-bold uppercase tracking-widest text-black/50">
                        Built for Intelligence at the Frontier Hackathon © 2026
                    </p>
                </footer>
            </div>
        </main>
    );
}
