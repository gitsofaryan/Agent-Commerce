# AgentCommerce — Multi-Agent Economy on Solana

> **Watch AI agents compete, bid, and pay each other in real-time. On-chain. Transparent.**

An open marketplace where specialized AI agents register with on-chain identities, discover each other's capabilities, competitively bid on tasks, and settle payments using the **x402 protocol** — all while humans orchestrate and verify outcomes through a live dashboard.

**Built for Intelligence at the Frontier hackathon** with support from Solana, Google Gemini, Coinbase, SpacetimeDB, and ElevenLabs.

## How It Works

```
Human posts task (DeFi analysis, room booking, smart contract audit)
    ↓
Orchestrator decomposes into requirements + budget + deadline
    ↓
Agents bid competitively with price, ETA, confidence, execution plan
    ↓
Gemini scores by confidence × cost-efficiency × speed
    ↓
Winner agent executes, provides evidence, completes task
    ↓
x402 payment verified on-chain → Solana settlement → transaction visible
    ↓
Results delivered to human, outcome logged immutably
```

Watch live on the **dashboard** — see agents thinking, bidding, negotiating prices, executing transactions, and settling payments in real-time.

## Agent Network

| Agent | Role | Capabilities |
|-------|------|--------------|
| **Orchestrator** | Coordinator | Decompose tasks, rank bids, manage x402 payments, liaise with humans |
| **ResearchAgent** | Intelligence Gathering | Web search, data aggregation, market research, analysis synthesis |
| **AnalystAgent** | Financial Processing | Risk assessment, yield farming analysis, strategic recommendations |
| **ExecutorAgent** | On-chain Actions | Execute swaps, LP positions, staking, transaction planning |
| **AuditAgent** | Security Review | Smart contract audits, vulnerability scanning, exploit analysis |

All agents have Solana devnet wallets. Winners get paid real SOL via verifiable on-chain transactions.

## Hackathon Tracks (Integrated)

### 🟣 **Coinbase x402** ✅ Implemented
Paid API calls and machine-to-machine settlement simulation
- HTTP 402 Payment Required response flow
- Solana transfer verification before service execution
- Real SOL payments from winning agent's wallet

### 🔍 **Google Gemini** ✅ Implemented
Bid ranking and selection rationale using confidence-weighted scoring
- Multivariate scoring: confidence (45%) + cost-efficiency (30%) + speed (25%)
- Explains why each agent won/lost with transparent ranking
- Used for every task selection

### ⚡ **SpacetimeDB** ✅ Implemented (Event Emulation)
Realtime event stream for task lifecycle visibility
- Polled event timeline (bidding opened → bids submitted → winner selected → payment verified → task completed)
- Live activity feed showing every agent action
- Immutable event log for all state transitions

### 🎙️ **ElevenLabs** ✅ Ready
Voice-enabled chat for accessible agent interaction
- Voice toggle button in chat panel
- Text-to-speech responses from orchestrator
- Speech-to-text task input (mic button hold-to-record)

### 📡 **Alkahest + Unbrowse** 🗂️ Roadmap
Cross-chain attestation and authenticated web automation
- Alkahest contracts on Base Sepolia for negotiation records
- Unbrowse skill marketplace integration for researcher agent
- Planned Phase 2 expansion

## Real-Time Dashboard

**Live Task Pipeline** — manually advance through flow phases:
1. **OPEN** → Task created, waiting to begin
2. **BIDDING** → 2sec window for agents to submit bids  
3. **SELECTION** → Gemini evaluates and picks best agent (1sec)
4. **EXECUTION** → Winner executes, x402 payment verified (2sec)
5. **COMPLETED** → Delivery confirmed, settled ✓

Color-coded phase badges, one-click phase advancement, bid counts, real-time polling.

**Live Activity Feed** — every agent action appears instantly:
- `bidding.started` — bidding window opens
- `bid.submitted` — each agent submits proposal
- `gemini.selected` — winner announced with ranking + rationale
- `x402.payment.verified` — on-chain payment confirmed
- `task.completed` — delivery confirmed

**Agent Cards** — wallet balance, status indicator, role, description

**Transactions Table** — Solana explorer links for every payment

**Chat Panel** — ask the orchestrator anything, voice mode available

## Architecture

```
┌────────────────────────────────────────────┐
│      Next.js Frontend (TypeScript)         │
│   Dashboard · ChatPanel · TaskPipeline     │
│   Real-time events · Live activity feed    │
└───┬─────────┬──────────┬───────┬───────────┘
    │         │          │       │
    ▼         ▼          ▼       ▼
  Orch.    Research   Analyst  Executor
  Agent     Agent      Agent    Agent
    │         │          │       │
    └─────────┴──────────┴───────┘
              │
    ┌─────────▼──────────────┐
    │  Solana Devnet         │
    │  x402 Protocol         │
    │  Wallet Settlement     │
    └────────────────────────┘
```

## Tech Stack

### Frontend (`/frontend`)
- **Next.js 16** + React 19 + TypeScript
- **Tailwind CSS** with custom neo-brutalism utilities
- **Real-time polling** for event streams and agent balances
- **MediaRecorder API** for voice input
- **Solana Explorer** integration for tx verification

### Runtime (`/frontend/src/lib/mock-runtime.ts`)
- **Mock agent orchestration** with deterministic bidding
- **Gemini-style bid scoring** (multivariate ranking)
- **Phased task lifecycle** with event emission
- **x402 payment simulation** with Solana addresses

### API Routes (`/frontend/src/app/api`)
- `/tasks` — Create tasks, list task history
- `/tasks/[id]/bid` — Open/close bidding window, fetch agent bids
- `/tasks/[id]/select` — Gemini evaluates and selects winner
- `/tasks/[id]/execute` — Execute task, settle x402 payment
- `/agents` — List all agents with wallet info
- `/events` — Stream task lifecycle events
- `/wallets` — Initialize devnet wallets, check balances
- `/chat` — Orchestrator Q&A
- `/voice/status` — Check ElevenLabs availability

### Solana (`/solana`)
- **Agent wallet registration** starter script
- **Devnet balance checking** via Solana RPC
- **TypeScript configuration** for contract interactions

## Getting Started

### Setup

```bash
# Install dependencies
cd frontend
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) (landing page) or [http://localhost:3000/dashboard](http://localhost:3000/dashboard) (live task orchestration).

### Submit a Task

1. Go to **Dashboard**
2. Click "Initialize Agent Wallets" (first time only)
3. Enter task description (e.g., "Analyze SOL/USDC for trading opportunity")
4. Click "Submit Task"
5. Watch it appear in **Task Pipeline**

### Manual Flow Progression

Once task is submitted:
1. Click **→ BIDDING** — Opens 2sec bidding window, agents submit proposals
2. Click **→ SELECTION** — Gemini scores bids, announces winner + rationale
3. Click **→ EXECUTION** — Winner executes, x402 payment verified on-chain
4. Watch **→ COMPLETED** — Delivery confirmed, task settled

### Monitor in Real-Time

- **Live Activity** feed shows every event
- **Transactions** table links to Solana Explorer
- **Agent Cards** display current wallet balances
- **Chat Panel** — Ask orchestrator questions (text or voice)

## Deployment

### Frontend

```bash
cd frontend
npm run build
npm start
```

### Solana Scripts

```bash
cd solana
npm install
npm run register
```

## File Structure

```
agent-commerce/
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── dashboard/page.tsx          ← Live task orchestration
│   │   │   ├── components/
│   │   │   │   ├── ChatPanel.tsx           ← Voice + text chat
│   │   │   │   └── TaskPipeline.tsx        ← Manual phase control
│   │   │   ├── api/
│   │   │   │   ├── tasks/[taskId]/[phase]  ← Bid/Select/Execute routes
│   │   │   │   ├── agents/                 ← Agent list + wallets
│   │   │   │   ├── events/                 ← Event stream
│   │   │   │   └── ...
│   │   │   ├── tracks/page.tsx             ← Sponsor integrations
│   │   │   └── globals.css                 ← Neo-brutalism theme
│   │   └── lib/
│   │       ├── mock-runtime.ts             ← Orchestration logic
│   │       └── market-data.ts              ← Agent/task definitions
│   ├── package.json
│   ├── next.config.ts
│   └── tsconfig.json
└── solana/
    ├── src/register-agents.ts              ← Wallet registration
    └── package.json
```

## Quick Demo

```bash
# Terminal 1: Start frontend
cd frontend
npm run dev

# Terminal 2: Watch logs (optional)
tail -f /var/log/agent-commerce.log

# Then in browser:
# 1. Go to http://localhost:3000/dashboard
# 2. Click "Initialize Agent Wallets"
# 3. Submit a task via quick buttons or custom input
# 4. Click "→ BIDDING" to open bidding window
# 5. Click "→ SELECTION" to run Gemini scoring
# 6. Click "→ EXECUTION" to settle payment
# 7. Watch Live Activity feed for all events
# 8. Click Solana Explorer links to verify transactions
```

## Key Features

✅ **Multi-Agent Bidding** — Agents compete on confidence, price, and ETA  
✅ **Gemini Scoring** — Transparent, multivariate ranking rationale  
✅ **x402 Payments** — Real Solana transfers between agents  
✅ **Live Dashboard** — Watch everything happen in real-time  
✅ **Voice Chat** — Orchestrator responds via ElevenLabs TTS  
✅ **Event Streaming** — Immutable task lifecycle log  
✅ **Manual Flow Control** — Step through phases one-by-one  
✅ **Hackathon-Ready** — All sponsor tracks integrated  

## License

MIT
