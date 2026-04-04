#!/usr/bin/env node

/* eslint-disable @typescript-eslint/no-require-imports */

/**
 * Generate demo wallets with only TWO unique addresses:
 * - TaskAgent wallet (payer/debit)
 * - Shared AI wallet (all bidding agents receive into this one address)
 *
 * Usage:
 *   node scripts/agentic-x402/generate-wallets.js
 *   node scripts/agentic-x402/generate-wallets.js --force
 */

const fs = require("fs");
const path = require("path");
const { Keypair } = require("@solana/web3.js");

const AGENT_NAMES = [
  "TaskAgent",
  "AgentPoolWallet",
  "BidAgent_1",
  "BidAgent_2",
  "BidAgent_3",
  "ExecutorAgent",
  "BrokerAgent",
];

function getAgentsFilePath() {
  if (process.env.AGENTS_FILE && process.env.AGENTS_FILE.trim()) {
    return path.resolve(process.env.AGENTS_FILE.trim());
  }
  return path.join(__dirname, "agents.json");
}

function hasForceFlag() {
  return process.argv.slice(2).includes("--force");
}

function main() {
  const outputPath = getAgentsFilePath();
  const force = hasForceFlag();

  if (fs.existsSync(outputPath) && !force) {
    console.error(`Refusing to overwrite existing file: ${outputPath}`);
    console.error("Pass --force if you want to regenerate all keys.");
    process.exit(1);
  }

  const buyerKeypair = Keypair.generate();
  const sharedAiKeypair = Keypair.generate();

  const records = {
    TaskAgent: {
      name: "TaskAgent",
      publicKey: buyerKeypair.publicKey.toBase58(),
      secretKeyArray: Array.from(buyerKeypair.secretKey),
    },
    AgentPoolWallet: {
      name: "AgentPoolWallet",
      publicKey: sharedAiKeypair.publicKey.toBase58(),
      secretKeyArray: Array.from(sharedAiKeypair.secretKey),
    },
  };

  // All bidder identities point to the same shared AI recipient wallet.
  for (const name of AGENT_NAMES) {
    if (name === "TaskAgent" || name === "AgentPoolWallet") continue;
    records[name] = {
      name,
      publicKey: sharedAiKeypair.publicKey.toBase58(),
      secretKeyArray: Array.from(sharedAiKeypair.secretKey),
    };
  }

  fs.writeFileSync(outputPath, JSON.stringify(records, null, 2), "utf8");

  console.log("Generated demo wallets (2 unique addresses):");
  console.log(`- TaskAgent (payer): ${records.TaskAgent.publicKey}`);
  console.log(
    `- Shared AI wallet (all bidder agents): ${records.AgentPoolWallet.publicKey}`,
  );

  console.log("\nAgent aliases sharing AI wallet:");
  [
    "BidAgent_1",
    "BidAgent_2",
    "BidAgent_3",
    "ExecutorAgent",
    "BrokerAgent",
  ].forEach((name) => {
    console.log(`- ${name} -> ${records[name].publicKey}`);
  });

  console.log(`\nSaved file: ${outputPath}`);
  console.log("\nAirdrop examples (devnet):");
  console.log(`solana airdrop 2 ${records.TaskAgent.publicKey} --url devnet`);
  console.log(
    `solana airdrop 2 ${records.AgentPoolWallet.publicKey} --url devnet`,
  );
  console.log("\nDo not commit agents.json.");
}

main();
