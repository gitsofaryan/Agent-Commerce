# Agent Commerce

Separated workspaces for frontend and Solana logic.

## Structure

- `frontend/`: Next.js app (landing page and web UI)
- `solana/`: Solana TypeScript scripts (wallet checks, agent registration starter)

## Frontend

```bash
cd frontend
npm install
npm run dev
```

Build:

```bash
cd frontend
npm run build
```

## Solana

```bash
cd solana
npm install
npm run register
```

`solana/src/register-agents.ts` currently validates configured agent wallets and prints balances on devnet. It is ready for Metaplex/x402 registration wiring next.
