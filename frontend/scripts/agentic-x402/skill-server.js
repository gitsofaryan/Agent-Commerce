#!/usr/bin/env node

/* eslint-disable @typescript-eslint/no-require-imports */

/**
 * Skill server with mock bidding + x402-style payment gate.
 * Bids are demo-only; payment verification is real on Solana devnet.
 */

require("dotenv").config();

const crypto = require("crypto");
const express = require("express");
const {
  loadAgentKeypair,
  verifyPayment,
  getBalance,
} = require("./solana-payment");

const AGENT_NAME = process.env.AGENT_NAME || "BidAgent_1";
const PORT = Number(process.env.PORT || 3001);
const CHALLENGE_TTL_MS = 5 * 60 * 1000;

const SKILLS = {
  analysis: 0.001,
  research: 0.0015,
  execution: 0.002,
};

const app = express();
app.use(express.json({ limit: "1mb" }));

let keypair;
try {
  keypair = loadAgentKeypair(AGENT_NAME);
} catch (error) {
  console.error(`Cannot load ${AGENT_NAME}: ${error.message}`);
  process.exit(1);
}

const pending = new Map();

app.get("/info", (_req, res) => {
  res.json({
    agent: AGENT_NAME,
    wallet: keypair.publicKey.toBase58(),
    skills: Object.entries(SKILLS).map(([skill, priceSOL]) => ({
      skill,
      priceSOL,
    })),
    network: "solana-devnet",
  });
});

app.get("/balance", async (_req, res) => {
  const balance = await getBalance(keypair.publicKey.toBase58());
  res.json({
    agent: AGENT_NAME,
    wallet: keypair.publicKey.toBase58(),
    balanceSOL: balance,
  });
});

// Mock bid for demo.
app.post("/bid", (req, res) => {
  const description = String(req.body?.taskDescription || "");
  const confidence = Number((0.75 + Math.random() * 0.24).toFixed(2));
  const bidAmount = Number((0.003 + Math.random() * 0.01).toFixed(4));

  res.json({
    agent: AGENT_NAME,
    interested: true,
    bid: {
      skill: /research|search/i.test(description) ? "research" : "analysis",
      confidence,
      bidAmountSOL: bidAmount,
      etaMinutes: Math.floor(10 + Math.random() * 40),
    },
  });
});

app.post("/execute", async (req, res) => {
  const paymentHeader = req.headers["x-payment"];
  const taskId = String(req.body?.taskId || `task-${Date.now()}`);

  if (!paymentHeader) {
    const nonce = crypto.randomUUID();
    const amountSOL = Number(req.body?.amountSOL || 0.005);
    const memo = `x402:${AGENT_NAME}:${taskId}:${nonce}`;

    pending.set(nonce, {
      amountSOL,
      memo,
      expiresAt: Date.now() + CHALLENGE_TTL_MS,
      recipient: keypair.publicKey.toBase58(),
      taskId,
    });

    return res.status(402).json({
      error: "Payment Required",
      payment: {
        protocol: "x402-solana",
        recipient: keypair.publicKey.toBase58(),
        amountSOL,
        memo,
        nonce,
        expiresAt: Date.now() + CHALLENGE_TTL_MS,
      },
    });
  }

  let parsed;
  try {
    parsed =
      typeof paymentHeader === "string"
        ? JSON.parse(paymentHeader)
        : paymentHeader;
  } catch {
    return res.status(400).json({ error: "Invalid X-Payment header" });
  }

  const challenge = pending.get(parsed?.nonce);
  if (!challenge) {
    return res.status(402).json({ error: "Unknown payment challenge" });
  }
  if (challenge.expiresAt < Date.now()) {
    pending.delete(parsed.nonce);
    return res.status(402).json({ error: "Payment challenge expired" });
  }

  const verification = await verifyPayment({
    txSignature: parsed.txSignature,
    expectedRecipient: challenge.recipient,
    expectedAmountSOL: challenge.amountSOL,
    expectedMemo: challenge.memo,
  });

  if (!verification.valid) {
    return res.status(402).json({
      error: "Payment verification failed",
      reason: verification.reason,
    });
  }

  pending.delete(parsed.nonce);

  res.json({
    ok: true,
    agent: AGENT_NAME,
    taskId: challenge.taskId,
    paidSOL: challenge.amountSOL,
    txSignature: parsed.txSignature,
    explorerUrl: verification.explorerUrl,
    result: "Mock execution complete",
  });
});

app.listen(PORT, () => {
  console.log(`Skill server ${AGENT_NAME} on http://localhost:${PORT}`);
  console.log(`Wallet: ${keypair.publicKey.toBase58()}`);
});
