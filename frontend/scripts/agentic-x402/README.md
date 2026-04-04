# Agentic Commerce x402-Style Scripts (Solana Devnet)

This folder contains standalone JS scripts to demo machine-to-machine payments for agentic commerce.

Flow implemented:
1. One task is posted and printed as dialogue.
2. All agents submit mock bids (dialogue style).
3. Gemini selects one winner (real API when key is configured).
4. x402 payment challenge + verification happens before settlement.
5. Real devnet transfer executes and prints debit wallet + credit wallet changes.

Wallet model:
- Exactly 2 unique addresses are used in demo wallets:
- `TaskAgent` = payer/debit wallet
- `AgentPoolWallet` = shared AI recipient wallet for all bidder identities

## Files

- `generate-wallets.js` creates 2 unique keypairs and maps all bidding agents to the shared AI wallet.
- `solana-payment.js` provides shared payment and verification helpers.
- `skill-server.js` exposes paid skills using x402-style 402 challenge flow.
- `task-client.js` runs tasks and auto-pays 402 challenges.
- `broker.js` runs dialogue flow with mock bidding, Gemini selection, x402 challenge, and real on-chain payment.

## Install

Run from `frontend` folder:

```bash
npm install
```

## 1) Generate wallets

```bash
npm run x402:wallets
```

This writes `scripts/agentic-x402/agents.json`.

To overwrite existing wallets:

```bash
npm run x402:wallets -- --force
```

## 2) Fund payer and shared AI wallets on devnet

Use addresses printed by wallet generation.

```bash
solana airdrop 2 <TASK_AGENT_ADDRESS> --url devnet
solana airdrop 2 <AGENT_POOL_WALLET_ADDRESS> --url devnet
```

## 3) Start skill agents (three terminals)

Terminal A:

```bash
AGENT_NAME=BidAgent_1 PORT=3001 node scripts/agentic-x402/skill-server.js
```

Terminal B:

```bash
AGENT_NAME=BidAgent_2 PORT=3002 node scripts/agentic-x402/skill-server.js
```

Terminal C:

```bash
AGENT_NAME=BidAgent_3 PORT=3003 node scripts/agentic-x402/skill-server.js
```

## 4) Run buyer direct flow

```bash
npm run x402:client
```

## 5) Run full auction broker flow

```bash
npm run x402:broker
```

## Optional environment variables

- `AGENTS_FILE` absolute or relative path to `agents.json`
- `SOLANA_RPC_URL` custom RPC (default: `https://api.devnet.solana.com`)
- `SOLANA_COMMITMENT` default `confirmed`
- `SKILL_AGENT_URLS` comma-separated endpoints for task client
- `SKILL_AGENT_REGISTRY` comma-separated endpoints for broker
- `BROKER_FEE_PERCENT` default `5`
- `GEMINI_API_KEY` enables real Gemini winner selection
- `GEMINI_MODEL` default `gemini-2.5-flash`

## Security note

`agents.json` contains private keys (as secret arrays). Keep it local and never commit it.
