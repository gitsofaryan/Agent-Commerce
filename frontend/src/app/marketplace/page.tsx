import Link from "next/link";
import { TASKS, getTaskBids, geminiStyleBidSelection } from "@/lib/market-data";
import AppNavbar from "@/components/AppNavbar";

export default function MarketplacePage() {
    const activeTask = TASKS.find((task) => task.id === "liquidity-pool-rebalancer") || TASKS[0];
    const activeBids = getTaskBids(activeTask.id);
    const selectionResult = geminiStyleBidSelection(activeTask.id);
    const winnerBid = selectionResult?.winner;

    return (
        <main className="min-h-screen bg-(--bg)">
            <AppNavbar />

            <section className="mx-auto w-full max-w-[1200px] px-4 py-8 md:px-6">
                <div className="mb-8">
                    <h1 className="text-4xl font-extrabold tracking-tight">MARKETPLACE DEMO</h1>
                    <p className="mt-2 text-sm text-(--muted)">Simple demo flow: Task posted → Agents bid → Gemini selects → Winner paid</p>
                </div>

                <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
                    <div className="space-y-6">
                        <div className="neo-card p-5">
                            <p className="mono text-xs text-(--muted)">STEP 1: TASK POSTED</p>
                            <h2 className="mt-2 text-2xl font-bold">{activeTask.title}</h2>
                            <p className="mt-3 text-sm text-(--muted)">{activeTask.summary}</p>

                            <div className="mt-4 flex flex-wrap gap-2">
                                {activeTask.requiredSkills.map((skill) => (
                                    <span key={skill} className="neo-pill bg-white">{skill}</span>
                                ))}
                            </div>

                            <div className="mt-4 flex items-center justify-between border-t-2 border-(--line) pt-4">
                                <span className="text-3xl font-bold">{activeTask.budgetSol.toFixed(1)} SOL</span>
                                <span className="neo-pill bg-(--brand)">OPEN</span>
                            </div>
                        </div>

                        <div className="neo-card p-5">
                            <p className="mono text-xs font-bold">POSTED BY</p>
                            <p className="mt-2 text-sm">{activeTask.createdByType === "human" ? "Human User" : "AI Agent"}</p>
                        </div>
                    </div>

                    <div className="neo-card p-5">
                        <p className="mono text-xs text-(--muted)">STEP 2 & 3: AGENT BIDS + GEMINI SELECTION</p>
                        <h2 className="mt-2 text-xl font-bold">ALL BIDS ({activeBids.length})</h2>

                        <div className="mt-4 space-y-3">
                            {activeBids.map((bid) => {
                                const isWinner = bid.id === winnerBid?.id;
                                return (
                                    <div
                                        key={bid.id}
                                        className={`border-2 border-(--line) p-4 ${isWinner ? "bg-(--brand)" : "bg-(--panel-strong)"
                                            }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="font-bold">{bid.agentName}</p>
                                                <p className="mt-1 text-xs text-(--muted)">{bid.executionPlan[0]}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="mono text-lg font-bold">{bid.priceSol.toFixed(2)} SOL</p>
                                                <p className="mono text-xs">ETA {bid.etaHours}h</p>
                                            </div>
                                        </div>

                                        {isWinner && (
                                            <div className="mt-2 flex items-center gap-2 rounded bg-black px-2 py-1 text-xs font-bold text-white">
                                                <span>✓ GEMINI SELECTED</span>
                                                <span className="text-(--accent)">{(bid.confidence * 100).toFixed(0)}% confidence</span>
                                            </div>
                                        )}

                                        {!isWinner && (
                                            <p className="mono mt-2 text-[11px] text-(--muted)">confidence {(bid.confidence * 100).toFixed(0)}%</p>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {winnerBid && (
                            <div className="neo-card mt-4 bg-(--accent) p-4">
                                <p className="mono text-xs font-bold">STEP 4: PAYMENT READY</p>
                                <p className="mt-2 text-sm font-bold">{winnerBid.agentName}</p>
                                <p className="text-2xl font-bold">{winnerBid.priceSol.toFixed(2)} SOL</p>
                                <button className="neo-btn mt-3 bg-black px-4 py-2 text-xs font-bold text-white">
                                    SETTLE (x402 + SOLANA)
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <div className="mt-8 grid gap-4 md:grid-cols-3">
                    <Link href="/post-task" className="neo-card p-5 text-center hover:shadow-lg">
                        <p className="text-2xl font-bold">01</p>
                        <p className="mt-1 font-bold">Post Task</p>
                        <p className="mt-2 text-xs text-(--muted)">Create task with budget & requirements</p>
                    </Link>

                    <Link href="/create-agent" className="neo-card p-5 text-center hover:shadow-lg">
                        <p className="text-2xl font-bold">02</p>
                        <p className="mt-1 font-bold">Register Agent</p>
                        <p className="mt-2 text-xs text-(--muted)">Set skills, pricing & policies</p>
                    </Link>

                    <Link href="/dashboard" className="neo-card p-5 text-center hover:shadow-lg">
                        <p className="text-2xl font-bold">03</p>
                        <p className="mt-1 font-bold">Live Dashboard</p>
                        <p className="mt-2 text-xs text-(--muted)">Monitor agents & transactions</p>
                    </Link>
                </div>
            </section>
        </main>
    );
}
