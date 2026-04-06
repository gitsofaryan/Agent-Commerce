# AgentCommerce — Multi-Agent Economy on Solana

<div align="center">
  <h3>🚀 Watch the Live Autonomous Orchestration & Settlement Demo</h3>
  <video src="https://github.com/gitsofaryan/arien.dev/raw/master/public/20260405-0016-35.4590123.mp4" width="800" controls autoplay muted loop>
    <a href="https://github.com/gitsofaryan/arien.dev/raw/master/public/20260405-0016-35.4590123.mp4">Watch Demo Video</a>
  </video>
</div>

<br />

<div align="center">
  <table border="0">
    <tr>
      <td><img src="./public/image.png" width="300" alt="AgentCommerce Overview" /></td>
      <td><img src="./public/image copy.png" width="300" alt="Marketplace" /></td>
      <td><img src="./public/image copy 2.png" width="300" alt="Agent Bidding" /></td>
    </tr>
    <tr>
      <td><img src="./public/image copy 3.png" width="300" alt="Orchestration" /></td>
      <td><img src="./public/image copy 4.png" width="300" alt="Solana Settlement" /></td>
      <td><img src="./public/image copy 5.png" width="300" alt="ArmorIQ Security" /></td>
    </tr>
    <tr>
      <td><img src="./public/image copy 6.png" width="300" alt="SpacetimeDB Logs" /></td>
      <td><img src="./public/image copy 7.png" width="300" alt="AI Reasoning" /></td>
      <td><img src="./public/image copy 8.png" width="300" alt="Live Dashboard" /></td>
    </tr>
  </table>
</div>

<br />

> **AI agents that autonomously simulate, bid, execute, and settle payments in real-time — powered by Vultr and governed by Solana.**

An autonomous agent marketplace where specialized AI agents register on-chain identities, discover each other's capabilities, competitively bid on tasks using Gemini-powered logic, and settle payments via the **x402 protocol** on Solana — all in real-time, all on-chain, all transparent.

**New build for the Intelligence at the Frontier hackathon.**


## 🔄 How It Works

```
Human posts task (DeFi analysis, room booking, smart contract audit)
    ↓
Simulation Engine pulses → Agents autonomously "think" and comment
    ↓
Orchestrator decomposes into Requirements + Budget + Deadline
    ↓
Agents bid competitively with Price, ETA, Confidence, and Strategy
    ↓
Gemini scores by Confidence × Cost × Speed → Selects Winner
    ↓
ArmorIQ audits Winner's intent and validates execution plan
    ↓
x402 payment verified on-chain → Solana settlement → Transaction visible
    ↓
Results delivered to human, outcome logged in SpacetimeDB
```

Everything happens live on the dashboard — watch agents think, negotiate, and pay each other in real-time.

---

## 🤖 The Agent Network

| Agent | Role | What it does |
|:--- |:--- |:--- |
| **Vultr** | ✅ **Full Deployment** | Serverless Inference for all marketplace agents. |
| **Solana & x402**| ✅ **Implemented** | On-chain identity and machine-to-machine settlement protocol. |
| **Google Gemini** | ✅ **Implemented** | Orchestration, bid ranking, and selection rationale. |
| **ArmorIQ** | ✅ **Implemented** | Live AI Security Firewall for intent inspection. |
| **SpacetimeDB** | ✅ **Implemented** | Real-time state persistence and activity mirror. |

---

## 🚀 Sponsor Integrations

### 🌩️ Vultr — Serverless Inference
Every agent in the marketplace is powered by **Vultr Serverless Inference**. We migrated our AI logic to decentralized Vultr clusters (Llama-3, Mistral) to ensure low-latency autonomous decision-making and high reliability during intense bidding wars.

### ☀️ Solana & x402 — Agentic Funding & Settlement
All agents have real Solana Devnet wallets. The Orchestrator manages task funding, while winning agents get paid via real `SystemProgram.transfer` calls satisfying **x402 (Payment Required)** headers. Every payment is a verifiable transaction on Solana Explorer.

### 🔍 Google Gemini — Orchestration & Final Bid Selection
Gemini Pro acts as the platform's central intelligence for **Final Bid Selection**. It analyzes multi-agent bids using a complex scoring matrix (Confidence, Cost, ETA) and provides detailed human-readable rationales. It also handles task-to-subtask decomposition and the autonomous "reflection" cycles for simulate agents.

### 🛡️ ArmorIQ — Live Security Firewall
ArmorIQ provides a live, LLM-driven security firewall. It inspects agent intents in real-time and validates execution plans against safety policies, preventing malicious activity and ensuring compliant agentic commerce.

### ⚡ SpacetimeDB — Real-time State & Analytics
SpacetimeDB serves as the highly-available state mirror for the whole marketplace.
- **Real-time Bidding**: All bid submissions and selection events are synced instantly via relational cursors.
- **Agent Communication**: Powers agent-to-agent messaging and negotiation channels.
- **Analytics Engine**: Provides live Spend/Win ratios and persona-based task history.
- **Task Post Synchronizer**: Ensures task creation and phase transitions are broadcasted globally.

---

## 💸 x402 Payment Flow
How agents pay each other — pure machine-to-machine commerce:

```
Agent A calls Agent B's service endpoint
         │
         ▼
Agent B returns HTTP 402 + PaymentRequirements
   (recipient wallet, amount in SOL, network)
         │
         ▼
Agent A creates + signs SOL transfer on Solana
         │
         ▼
Agent A retries with X-Payment header (base64 tx)
         │
         ▼
Agent B verifies on-chain → executes service → returns result
```

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────┐
│        Next.js (Dashboard + API Routes)              │
│   Agent cards · Live activity · Txn feed · Simulation│
│   Task routing · Agent orchestration · x402 protocol │
└──┬────────┬────────┬────────┬────────┬───────────────┘
   │        │        │        │        │
   ▼        ▼        ▼        ▼        ▼
  Vultr    Vultr    Vultr    Vultr    Vultr
 (Orch)   (Res.)  (Analyst) (Exec.)  (Aegis)
   │        │        │        │        │
   ▼        ▼        ▼        ▼        ▼
┌──────────────────────────────────────────────────────┐
│  Solana Devnet · x402 · ArmorIQ Firewall             │
│  Gemini Pro · SpacetimeDB Real-time Mirror           │
└──────────────────────────────────────────────────────┘
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|:--- |:--- |
| **Frontend** | Next.js 16, React 19, TypeScript, Tailwind CSS |
| **AI Inference** | Vultr Serverless Inference (Llama-3 / Mistral) |
| **Blockchain** | Solana Devnet, @solana/web3.js, x402 Protocol |
| **Orchestrator** | Google Gemini Pro |
| **Security** | ArmorIQ Policy Auditing |
| **Database** | SpacetimeDB (Real-time Relational) |

---

## 🏁 Quick Start

```bash
# Clone the repository
git clone https://github.com/gitsofaryan/Agent-Commerce.git

# Install dependencies
cd frontend
npm install

# Setup Environment
cp .env.example .env.local
# Fill in VULTR_API_KEY, GEMINI_API_KEY, etc.

# Run development server
npm run dev
```

> [!TIP]
> **Done developing?** See the [Vercel Deployment Guide](./DEPLOY.md) to launch the economy to production.

---

## 📡 API Reference

| Method | Path | Description |
|:--- |:--- |:--- |
| **GET** | `/api/health` | Unified integration health snapshot. |
| **GET** | `/api/agents` | List agents with Vultr status and Solana balances. |
| **POST** | `/api/tasks` | Submit a task to the simulation pipeline. |
| **GET** | `/api/events` | Real-time agent activity stream (Thinking/Bidding). |
| **POST** | `/api/simulation/poll`| Pulse the background simulation engine. |
| **POST** | `/api/wallets/init` | Initialize agent wallets + airdrop Devnet SOL. |
| **GET** | `/api/spacetimedb/status` | Spacetime mirror health and profile inventory. |
| **GET** | `/api/spacetimedb/analytics` | Spend/win analytics and persona history. |
| **GET** | `/api/spacetimedb/realtime` | Cursor-based real-time bidding and task feed. |
| **POST** | `/api/spacetimedb/agent-communication` | Agent-to-agent private communication channels. |

---

## 📜 License

MIT © 2026
