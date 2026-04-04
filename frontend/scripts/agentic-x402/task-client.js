#!/usr/bin/env node

/* eslint-disable @typescript-eslint/no-require-imports */

/**
 * Task client:
 * - requests mock bids from skill servers
 * - mock-selects winner (Gemini-style scoring)
 * - performs real Solana payment after 402 challenge
 */

require("dotenv").config();

const {
  loadAgentKeypair,
  getBalance,
  sendPayment,
  ensureMinBalance,
} = require("./solana-payment");

const TASK_AGENT_NAME = process.env.TASK_AGENT_NAME || "TaskAgent";
const SKILL_AGENT_URLS = (
  process.env.SKILL_AGENT_URLS ||
  "http://localhost:3001,http://localhost:3002,http://localhost:3003"
)
  .split(",")
  .map((x) => x.trim())
  .filter(Boolean);

async function fetchJson(url, init) {
  const response = await fetch(url, init);
  const payload = await response.json().catch(() => ({}));
  return { response, payload };
}

function selectWinnerRandom(bids) {
  if (bids.length === 0) return null;
  const idx = Math.floor(Math.random() * bids.length);
  const winner = bids[idx];
  return {
    winner,
    source: "random",
    reason: `Randomly selected ${winner.agent} for this demo run`,
  };
}

async function main() {
  const payer = loadAgentKeypair(TASK_AGENT_NAME);
  await ensureMinBalance(payer, 0.5);

  const wallet = payer.publicKey.toBase58();
  const before = await getBalance(wallet);

  console.log(`Task agent: ${TASK_AGENT_NAME}`);
  console.log(`Address: ${wallet}`);
  console.log(`Balance before: ${before.toFixed(6)} SOL`);

  const task = {
    taskId: `task-${Date.now()}`,
    taskDescription: "Demo task with mock bids and real settlement",
    amountSOL: 0.006,
  };

  const bids = [];
  for (const url of SKILL_AGENT_URLS) {
    try {
      const { response, payload } = await fetchJson(`${url}/bid`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(task),
      });
      if (response.ok && payload?.interested) {
        bids.push({ ...payload, url });
      }
    } catch {
      // ignore unreachable server
    }
  }

  if (bids.length === 0) {
    console.error("No mock bids received. Start skill servers first.");
    process.exit(1);
  }

  const winnerSelection = selectWinnerRandom(bids);
  const winner = winnerSelection?.winner;
  if (!winner) {
    console.error("No winner could be selected.");
    process.exit(1);
  }

  console.log(
    `${winnerSelection.source === "random" ? "Random" : "Selector"} selected: ${winner.agent} (${winner.bid.bidAmountSOL} SOL)`,
  );
  console.log(`Reason: ${winnerSelection.reason}`);

  const first = await fetchJson(`${winner.url}/execute`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      taskId: task.taskId,
      amountSOL: winner.bid.bidAmountSOL,
    }),
  });

  if (first.response.status !== 402 || !first.payload?.payment) {
    console.error("Expected 402 challenge from winner agent.");
    process.exit(1);
  }

  const payment = first.payload.payment;

  const txSignature = await sendPayment({
    fromKeypair: payer,
    toPublicKey: payment.recipient,
    amountSOL: payment.amountSOL,
    memo: payment.memo,
  });

  const second = await fetchJson(`${winner.url}/execute`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Payment": JSON.stringify({ txSignature, nonce: payment.nonce }),
    },
    body: JSON.stringify({ taskId: task.taskId, amountSOL: payment.amountSOL }),
  });

  if (!second.response.ok) {
    console.error("Execution failed after payment:", second.payload);
    process.exit(1);
  }

  const after = await getBalance(wallet);
  const spent = before - after;

  console.log("\nExecution complete");
  console.log(`- Winner: ${winner.agent}`);
  console.log(`- Paid: ${payment.amountSOL} SOL`);
  console.log(`- TX: ${txSignature}`);
  console.log(
    `- Explorer: https://explorer.solana.com/tx/${txSignature}?cluster=devnet`,
  );
  console.log(`- Balance after: ${after.toFixed(6)} SOL`);
  console.log(`- Spent: ${spent.toFixed(6)} SOL`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
