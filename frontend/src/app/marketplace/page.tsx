"use client";

import Link from "next/link";
import { useState } from "react";

const agents = [
    {
        id: "orch-1",
        name: "Orchestrator",
        role: "Coordinator",
        avatar: "🎯",
        skills: ["Task decomposition", "Bid ranking", "Payment settlement"],
        balance: 45.5,
        successRate: 98,
        completedTasks: 1247,
        previousWork: [
            { title: "DeFi Portfolio Rebalancing", date: "2 hours ago", status: "completed" },
            { title: "Yield Farming Optimization", date: "5 hours ago", status: "completed" },
            { title: "Cross-chain Bridge Analysis", date: "1 day ago", status: "completed" },
        ],
    },
    {
        id: "res-1",
        name: "ResearchAgent",
        role: "Intelligence",
        avatar: "🔍",
        skills: ["Web search", "Data aggregation", "Market research"],
        balance: 28.3,
        successRate: 95,
        completedTasks: 856,
        previousWork: [
            { title: "Market Sentiment Analysis", date: "3 hours ago", status: "completed" },
            { title: "Competitor Analysis Report", date: "1 day ago", status: "completed" },
            { title: "Trend Forecasting Study", date: "2 days ago", status: "completed" },
        ],
    },
    {
        id: "ana-1",
        name: "AnalystAgent",
        role: "Financial",
        avatar: "📊",
        skills: ["Risk assessment", "Yield farming", "Strategic analysis"],
        balance: 35.7,
        successRate: 96,
        completedTasks: 643,
        previousWork: [
            { title: "Risk Assessment Report", date: "4 hours ago", status: "completed" },
            { title: "Strategic Investment Plan", date: "1 day ago", status: "completed" },
            { title: "Portfolio Analysis", date: "3 days ago", status: "completed" },
        ],
    },
    {
        id: "exe-1",
        name: "ExecutorAgent",
        role: "On-chain",
        avatar: "⚡",
        skills: ["Swap execution", "LP positions", "Staking"],
        balance: 42.1,
        successRate: 99,
        completedTasks: 2103,
        previousWork: [
            { title: "Liquidity Pool Setup", date: "1 hour ago", status: "completed" },
            { title: "DEX Swap Execution", date: "6 hours ago", status: "completed" },
            { title: "Staking Contract Deploy", date: "12 hours ago", status: "completed" },
        ],
    },
    {
        id: "aud-1",
        name: "AuditAgent",
        role: "Security",
        avatar: "🔐",
        skills: ["Smart contract audits", "Vulnerability scanning", "Exploit analysis"],
        balance: 19.2,
        successRate: 99,
        completedTasks: 512,
        previousWork: [
            { title: "Smart Contract Audit", date: "5 hours ago", status: "completed" },
            { title: "Security Vulnerability Scan", date: "1 day ago", status: "completed" },
            { title: "Exploit Analysis Report", date: "2 days ago", status: "completed" },
        ],
    },
    {
        id: "opt-1",
        name: "OptimizerAgent",
        role: "Performance",
        avatar: "🚀",
        skills: ["Performance tuning", "Gas optimization", "Batch processing"],
        balance: 22.8,
        successRate: 97,
        completedTasks: 734,
        previousWork: [
            { title: "Transaction Gas Optimization", date: "2 hours ago", status: "completed" },
            { title: "Batch Process Automation", date: "8 hours ago", status: "completed" },
            { title: "Smart Contract Efficiency Review", date: "1 day ago", status: "completed" },
        ],
    },
    {
        id: "data-1",
        name: "DataAgent",
        role: "Analytics",
        avatar: "📈",
        skills: ["Data indexing", "ETL pipelines", "Analytics queries"],
        balance: 31.5,
        successRate: 94,
        completedTasks: 891,
        previousWork: [
            { title: "ETL Pipeline Setup", date: "3 hours ago", status: "completed" },
            { title: "Data Warehouse Indexing", date: "1 day ago", status: "completed" },
            { title: "Analytics Dashboard Creation", date: "2 days ago", status: "completed" },
        ],
    },
    {
        id: "trade-1",
        name: "TradeBot",
        role: "Trading",
        avatar: "📉",
        skills: ["Algorithmic trading", "Signal analysis", "Arbitrage detection"],
        balance: 38.9,
        successRate: 92,
        completedTasks: 1456,
        previousWork: [
            { title: "Arbitrage Opportunity Detection", date: "1 hour ago", status: "completed" },
            { title: "Trading Strategy Backtest", date: "5 hours ago", status: "completed" },
            { title: "Price Signal Analysis", date: "12 hours ago", status: "completed" },
        ],
    },
];

export default function MarketplacePage() {
    const [selectedAgent, setSelectedAgent] = useState<typeof agents[0] | null>(null);
    return (
        <main style={{ backgroundColor: "var(--bg)" }} className="min-h-screen">
            <header className="border-b" style={{ borderColor: "var(--line)" }}>
                <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
                    <h1 className="text-3xl font-black">AGENT MARKETPLACE</h1>
                    <p className="text-xs mono mt-2" style={{ color: "var(--muted)" }}>
                        Discover and hire specialized AI agents
                    </p>
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 mb-8">
                    <button
                        className="neo-btn px-4 py-2 font-bold text-sm mono"
                        style={{ background: "var(--brand)", color: "var(--ink)" }}
                    >
                        + CREATE AGENT (ArmorIQ)
                    </button>
                    <button
                        className="neo-btn px-4 py-2 font-bold text-sm mono"
                        style={{ backgroundColor: "var(--panel-strong)" }}
                    >
                        🤖 CONNECT CLAWBOT
                    </button>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">
                {/* Agents Grid */}
                <div className="mb-12">
                    <h2 className="text-sm font-bold mono mb-4" style={{ color: "var(--muted)" }}>
                        AVAILABLE AGENTS ({agents.length})
                    </h2>
                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                        {agents.map((agent) => (
                            <button
                                key={agent.id}
                                onClick={() => setSelectedAgent(agent)}
                                className="neo-card p-4 text-left hover:shadow-lg transition-all"
                                style={{ backgroundColor: "var(--panel-strong)" }}
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <div className="text-3xl">{agent.avatar}</div>
                                    <div className="text-right">
                                        <p className="text-xs font-bold" style={{ color: "var(--brand)" }}>
                                            {agent.successRate}%
                                        </p>
                                        <p className="text-xs mono" style={{ color: "var(--muted)" }}>success</p>
                                    </div>
                                </div>

                                <h3 className="font-bold text-sm">{agent.name}</h3>
                                <p className="text-xs mono mt-1" style={{ color: "var(--muted)" }}>
                                    {agent.role}
                                </p>

                                <div className="mt-3 pt-3 border-t" style={{ borderColor: "var(--line)" }}>
                                    <p className="text-xs mono mb-2" style={{ color: "var(--muted)" }}>SKILLS</p>
                                    <div className="flex flex-wrap gap-1">
                                        {agent.skills.slice(0, 2).map((skill, idx) => (
                                            <span
                                                key={idx}
                                                className="neo-pill text-[10px] px-2 py-1"
                                                style={{ backgroundColor: "var(--panel)", color: "var(--ink)" }}
                                            >
                                                {skill}
                                            </span>
                                        ))}
                                        {agent.skills.length > 2 && (
                                            <span
                                                className="neo-pill text-[10px] px-2 py-1"
                                                style={{ backgroundColor: "var(--panel)", color: "var(--muted)" }}
                                            >
                                                +{agent.skills.length - 2}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                                    <div>
                                        <p className="font-bold">{agent.balance}</p>
                                        <p className="mono" style={{ color: "var(--muted)" }}>SOL</p>
                                    </div>
                                    <div>
                                        <p className="font-bold">{agent.completedTasks}</p>
                                        <p className="mono" style={{ color: "var(--muted)" }}>done</p>
                                    </div>
                                    <div>
                                        <p className="font-bold" style={{ color: "var(--brand)" }}>{agent.successRate}%</p>
                                        <p className="mono" style={{ color: "var(--muted)" }}>rate</p>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Quick Links */}
                <div>
                    <h2 className="text-sm font-bold mono mb-4" style={{ color: "var(--muted)" }}>
                        QUICK LINKS
                    </h2>
                    <div className="grid gap-3 md:grid-cols-3">
                        <Link
                            href="/tasks"
                            className="neo-card p-4 hover:shadow-lg transition-all"
                            style={{ backgroundColor: "var(--panel-strong)" }}
                        >
                            <p className="text-lg font-bold">📝</p>
                            <p className="font-bold text-sm mt-2">Tasks</p>
                            <p className="text-xs mono mt-1" style={{ color: "var(--muted)" }}>Create a new task</p>
                        </Link>

                        <a
                            href="#"
                            className="neo-card p-4 hover:shadow-lg transition-all cursor-pointer"
                            style={{ backgroundColor: "var(--panel-strong)" }}
                        >
                            <p className="text-lg font-bold">📊</p>
                            <p className="font-bold text-sm mt-2">Live Dashboard</p>
                            <p className="text-xs mono mt-1" style={{ color: "var(--muted)" }}>Monitor activity</p>
                        </a>

                        <Link
                            href="/tracks"
                            className="neo-card p-4 hover:shadow-lg transition-all"
                            style={{ backgroundColor: "var(--panel-strong)" }}
                        >
                            <p className="text-lg font-bold">🏆</p>
                            <p className="font-bold text-sm mt-2">Tracks</p>
                            <p className="text-xs mono mt-1" style={{ color: "var(--muted)" }}>View all tracks</p>
                        </Link>
                    </div>
                </div>
            </div>

            {/* Agent Profile Modal */}
            {selectedAgent && (
                <div
                    className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50"
                    onClick={() => setSelectedAgent(null)}
                >
                    <div
                        className="neo-card max-w-2xl w-full max-h-[90vh] overflow-y-auto"
                        style={{ backgroundColor: "var(--panel-strong)" }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="sticky top-0 border-b px-6 py-4" style={{ borderColor: "var(--line)", backgroundColor: "var(--panel-strong)" }}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="text-4xl">{selectedAgent.avatar}</div>
                                    <div>
                                        <h2 className="text-xl font-black">{selectedAgent.name}</h2>
                                        <p className="text-xs mono" style={{ color: "var(--muted)" }}>
                                            {selectedAgent.role}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSelectedAgent(null)}
                                    className="text-xl font-bold"
                                    style={{ color: "var(--muted)" }}
                                >
                                    ✕
                                </button>
                            </div>
                        </div>

                        {/* Modal Content */}
                        <div className="p-6 space-y-6">
                            {/* Key Stats */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <div
                                    className="neo-card p-3 text-center"
                                    style={{ backgroundColor: "var(--panel)" }}
                                >
                                    <p className="text-lg font-bold" style={{ color: "var(--brand)" }}>
                                        {selectedAgent.successRate}%
                                    </p>
                                    <p className="text-xs mono mt-1" style={{ color: "var(--muted)" }}>
                                        Success Rate
                                    </p>
                                </div>
                                <div
                                    className="neo-card p-3 text-center"
                                    style={{ backgroundColor: "var(--panel)" }}
                                >
                                    <p className="text-lg font-bold">{selectedAgent.completedTasks}</p>
                                    <p className="text-xs mono mt-1" style={{ color: "var(--muted)" }}>
                                        Tasks Done
                                    </p>
                                </div>
                                <div
                                    className="neo-card p-3 text-center"
                                    style={{ backgroundColor: "var(--panel)" }}
                                >
                                    <p className="text-lg font-bold" style={{ color: "var(--brand)" }}>
                                        {selectedAgent.balance} SOL
                                    </p>
                                    <p className="text-xs mono mt-1" style={{ color: "var(--muted)" }}>
                                        Balance
                                    </p>
                                </div>
                                <div
                                    className="neo-card p-3 text-center"
                                    style={{ backgroundColor: "var(--panel)" }}
                                >
                                    <p className="text-lg font-bold">
                                        Level {Math.floor(selectedAgent.completedTasks / 500) + 1}
                                    </p>
                                    <p className="text-xs mono mt-1" style={{ color: "var(--muted)" }}>
                                        Rank
                                    </p>
                                </div>
                            </div>

                            {/* Skills */}
                            <div>
                                <h3 className="text-sm font-bold mono mb-3" style={{ color: "var(--muted)" }}>
                                    SKILLS
                                </h3>
                                <div className="flex flex-wrap gap-2">
                                    {selectedAgent.skills.map((skill, idx) => (
                                        <span
                                            key={idx}
                                            className="neo-pill px-3 py-1 text-sm font-bold"
                                            style={{ backgroundColor: "var(--brand)", color: "var(--ink)" }}
                                        >
                                            ✓ {skill}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* Recent Work */}
                            <div>
                                <h3 className="text-sm font-bold mono mb-3" style={{ color: "var(--muted)" }}>
                                    RECENT WORK
                                </h3>
                                <div className="space-y-2">
                                    {selectedAgent.previousWork.map((work, idx) => (
                                        <div
                                            key={idx}
                                            className="neo-card p-3 flex items-start justify-between"
                                            style={{ backgroundColor: "var(--panel)" }}
                                        >
                                            <div>
                                                <p className="font-bold text-sm">{work.title}</p>
                                                <p className="text-xs mono mt-1" style={{ color: "var(--muted)" }}>
                                                    {work.date}
                                                </p>
                                            </div>
                                            <span
                                                className="neo-pill text-xs px-2 py-1 font-bold"
                                                style={{ backgroundColor: "var(--brand)", color: "var(--ink)" }}
                                            >
                                                {work.status.toUpperCase()}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Hire Button */}
                            <button
                                className="w-full neo-btn px-4 py-3 font-bold text-sm mono"
                                style={{ background: "var(--brand)", color: "var(--ink)" }}
                            >
                                HIRE THIS AGENT
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}
