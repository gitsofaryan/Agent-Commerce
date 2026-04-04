#!/usr/bin/env node

/* eslint-disable @typescript-eslint/no-require-imports */

/**
 * Dialogue demo:
 * 1) One task is posted.
 * 2) All agents place mock bids.
 * 3) Winner is selected randomly from AI agents.
 * 4) x402 challenge/verification is done.
 * 5) Real payment is sent on Solana devnet.
 *
 * Wallet model:
 * - Debit wallet: TaskAgent
 * - Credit wallet: one shared AI wallet (same address for all bidding agents)
 */

require("dotenv").config();

const {
  loadAllAgents,
  ensureMinBalance,
  getBalance,
  sendPayment,
  verifyPayment,
} = require("./solana-payment");

const BUYER_AGENT = process.env.BUYER_AGENT_NAME || "TaskAgent";
const SHARED_AI_WALLET_AGENT =
  process.env.SHARED_AI_WALLET_AGENT || "AgentPoolWallet";
const TASK_BUDGET_SOL = Number(process.env.TASK_BUDGET_SOL || 0.01);

const MOCK_TASKS = [
  {
    id: "t-001",
    description: "Need market analysis report for token launch strategy",
    budgetSOL: TASK_BUDGET_SOL,
  },
];

function say(speaker, message) {
  console.log(`[${speaker}] ${message}`);
}

function formatSol(amount) {
  return `${Number(amount).toFixed(4)} SOL`;
}

function buildMockBids(task, candidateNames) {
  return candidateNames.map((name, idx) => {
    const confidence = Number((0.76 + Math.random() * 0.22).toFixed(2));
    const bidAmountSOL = Number(
      (task.budgetSOL * (0.7 + Math.random() * 0.3)).toFixed(4),
    );
    const etaMinutes = Math.floor(8 + Math.random() * 45);

    return {
      bidId: `${task.id}-bid-${idx + 1}`,
      taskId: task.id,
      agentName: name,
      bidAmountSOL,
      confidence,
      etaMinutes,
      comment: "Mock demo bid",
    };
  });
}

function selectWinnerRandom(bids) {
  const idx = Math.floor(Math.random() * bids.length);
  const winner = bids[idx];
  return {
    winner,
    source: "random",
    rationale: `Randomly selected ${winner.agentName} for this demo round.`,
  };
}

async function settleRealPayment({
  buyerKeypair,
  recipientKeypair,
  amountSOL,
  taskId,
}) {
  const buyerAddress = buyerKeypair.publicKey.toBase58();
  const recipientAddress = recipientKeypair.publicKey.toBase58();

  const buyerBefore = await getBalance(buyerAddress);
  const recipientBefore = await getBalance(recipientAddress);

  const nonce = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  const memo = `x402:${taskId}:${nonce}`;

  // x402-style challenge between bidding and payment.
  const paymentChallenge = {
    protocol: "x402-solana",
    recipient: recipientAddress,
    amountSOL,
    memo,
    nonce,
  };

  say(
    "x402",
    `Payment Required -> recipient=${paymentChallenge.recipient}, amount=${formatSol(paymentChallenge.amountSOL)}, nonce=${paymentChallenge.nonce}`,
  );

  const txSignature = await sendPayment({
    fromKeypair: buyerKeypair,
    toPublicKey: paymentChallenge.recipient,
    amountSOL: paymentChallenge.amountSOL,
    memo: paymentChallenge.memo,
  });

  say("TaskAgent", `Sent payment tx: ${txSignature}`);

  const verification = await verifyPayment({
    txSignature,
    expectedRecipient: paymentChallenge.recipient,
    expectedAmountSOL: paymentChallenge.amountSOL,
    expectedMemo: paymentChallenge.memo,
  });

  if (!verification.valid) {
    throw new Error(`x402 verification failed: ${verification.reason}`);
  }

  say("x402", "Payment verified on-chain");

  const buyerAfter = await getBalance(buyerAddress);
  const recipientAfter = await getBalance(recipientAddress);

  return {
    txSignature,
    memo,
    challenge: paymentChallenge,
    buyerAddress,
    recipientAddress,
    buyerBefore,
    buyerAfter,
    recipientBefore,
    recipientAfter,
    recipientIncrease: Number((recipientAfter - recipientBefore).toFixed(6)),
    buyerDecrease: Number((buyerBefore - buyerAfter).toFixed(6)),
    explorerUrl: `https://explorer.solana.com/tx/${txSignature}?cluster=devnet`,
  };
}

async function runTaskAuction(task, agents) {
  const buyer = agents[BUYER_AGENT];
  if (!buyer) throw new Error(`Buyer agent missing: ${BUYER_AGENT}`);

  const sharedRecipient = agents[SHARED_AI_WALLET_AGENT] || agents.BidAgent_1;
  if (!sharedRecipient) {
    throw new Error(
      `Shared AI wallet agent missing: ${SHARED_AI_WALLET_AGENT}`,
    );
  }

  // Exclude buyer from bidders. Bidding is fully mock for demo.
  const bidders = [
    "BidAgent_1",
    "BidAgent_2",
    "BidAgent_3",
    "ExecutorAgent",
    "BrokerAgent",
  ].filter((name) => !!agents[name] && name !== BUYER_AGENT);
  const mockBids = buildMockBids(task, bidders);

  console.log("\n--- DIALOGUE START ---");
  say("TaskAgent", `Task posted: ${task.description}`);
  say("TaskAgent", `Budget: ${formatSol(task.budgetSOL)}`);
  say(
    "System",
    `All bidders share one AI wallet address: ${sharedRecipient.publicKey}`,
  );

  say("System", "All agents now submit mock bids:");
  mockBids.forEach((bid) => {
    say(
      bid.agentName,
      `I bid ${formatSol(bid.bidAmountSOL)} (confidence ${bid.confidence}, ETA ${bid.etaMinutes}m)`,
    );
  });

  const selection = selectWinnerRandom(mockBids);
  const winner = selection.winner;

  say("Orchestrator(Random)", `Selected winner: ${winner.agentName}`);
  say("Orchestrator(Random)", selection.rationale);

  // Even though a logical winner is selected, all agent identities share one wallet address.
  say(
    "System",
    `Winner payout address (shared AI wallet): ${sharedRecipient.publicKey}`,
  );

  const requiredBuyerBalance = Number((winner.bidAmountSOL + 0.05).toFixed(4));
  await ensureMinBalance(buyer.keypair, requiredBuyerBalance);

  const settlement = await settleRealPayment({
    buyerKeypair: buyer.keypair,
    recipientKeypair: sharedRecipient.keypair,
    amountSOL: winner.bidAmountSOL,
    taskId: task.id,
  });

  say("System", "x402 settlement complete");
  say("System", `TX: ${settlement.txSignature}`);
  say("System", `Explorer: ${settlement.explorerUrl}`);
  say(
    "System",
    `Debit wallet (${settlement.buyerAddress}) before=${settlement.buyerBefore.toFixed(6)} after=${settlement.buyerAfter.toFixed(6)} change=-${settlement.buyerDecrease.toFixed(6)} SOL`,
  );
  say(
    "System",
    `Credit wallet (${settlement.recipientAddress}) before=${settlement.recipientBefore.toFixed(6)} after=${settlement.recipientAfter.toFixed(6)} change=+${settlement.recipientIncrease.toFixed(6)} SOL`,
  );
  console.log("--- DIALOGUE END ---");

  return {
    taskId: task.id,
    winner: winner.agentName,
    amountSOL: winner.bidAmountSOL,
    recipientWallet: sharedRecipient.publicKey,
    settlement,
  };
}

async function main() {
  const agents = loadAllAgents();
  if (!agents[BUYER_AGENT]) {
    throw new Error(`Missing ${BUYER_AGENT}. Run npm run x402:wallets first.`);
  }

  console.log("Agentic commerce demo");
  console.log(
    "Mode: dialogue + mock bidding + random winner + x402 + real Solana payment",
  );

  const results = [];
  for (const task of MOCK_TASKS) {
    const result = await runTaskAuction(task, agents);
    results.push(result);
  }

  const totalPaid = results.reduce((sum, r) => sum + r.amountSOL, 0);

  console.log("\nSummary");
  console.log(`- Tasks processed: ${results.length}`);
  console.log(`- Total paid: ${totalPaid.toFixed(6)} SOL`);
  results.forEach((r) => {
    console.log(
      `- ${r.taskId}: winner=${r.winner} | amount=${r.amountSOL} SOL`,
    );
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
