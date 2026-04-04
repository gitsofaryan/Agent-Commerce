# Solana Workspace

This folder contains Solana-specific scripts for Agentic Commerce.

## Commands

- npm install
- npm run register

## Environment

Set these values in a local `.env` in this folder:

- SOLANA_RPC_URL
- ORCHESTRATOR_PRIVATE_KEY
- RESEARCHER_PRIVATE_KEY
- ANALYST_PRIVATE_KEY
- EXECUTOR_PRIVATE_KEY
- SUPPORT_PRIVATE_KEY

Private keys are expected as JSON arrays (Uint8 bytes) compatible with `Keypair.fromSecretKey`.
