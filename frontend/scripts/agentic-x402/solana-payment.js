#!/usr/bin/env node

/* eslint-disable @typescript-eslint/no-require-imports */

/**
 * Shared Solana helpers for x402-style payment demo scripts.
 */

const fs = require("fs");
const path = require("path");
const bs58 = require("bs58");
const {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
} = require("@solana/web3.js");

const SOLANA_RPC_URL =
  process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";
const SOLANA_COMMITMENT = process.env.SOLANA_COMMITMENT || "confirmed";
const MEMO_PROGRAM_ID = "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr";

const connection = new Connection(SOLANA_RPC_URL, SOLANA_COMMITMENT);

function getAgentsFilePath() {
  if (process.env.AGENTS_FILE && process.env.AGENTS_FILE.trim()) {
    return path.resolve(process.env.AGENTS_FILE.trim());
  }
  return path.join(__dirname, "agents.json");
}

function readAgents() {
  const filePath = getAgentsFilePath();
  if (!fs.existsSync(filePath)) {
    throw new Error(
      `agents file not found: ${filePath}. Run x402:wallets first.`,
    );
  }
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function loadAgentKeypair(agentName) {
  const agents = readAgents();
  const entry = agents[agentName];
  if (!entry || !Array.isArray(entry.secretKeyArray)) {
    throw new Error(`Agent ${agentName} not found in agents file`);
  }
  return Keypair.fromSecretKey(Uint8Array.from(entry.secretKeyArray));
}

function loadAllAgents() {
  const agents = readAgents();
  const out = {};
  for (const [name, row] of Object.entries(agents)) {
    if (!Array.isArray(row.secretKeyArray)) continue;
    const keypair = Keypair.fromSecretKey(Uint8Array.from(row.secretKeyArray));
    out[name] = {
      name,
      publicKey: keypair.publicKey.toBase58(),
      keypair,
    };
  }
  return out;
}

async function getBalance(publicKey) {
  const lamports = await connection.getBalance(
    new PublicKey(publicKey),
    SOLANA_COMMITMENT,
  );
  return lamports / LAMPORTS_PER_SOL;
}

async function ensureMinBalance(keypair, minSol) {
  const current = await getBalance(keypair.publicKey.toBase58());
  if (current >= minSol) return current;

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const needed = Math.max(minSol - current, 0.1);
  const lamports = Math.ceil(needed * LAMPORTS_PER_SOL);

  let lastError = null;
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      const sig = await connection.requestAirdrop(keypair.publicKey, lamports);
      await connection.confirmTransaction(sig, SOLANA_COMMITMENT);

      const after = await getBalance(keypair.publicKey.toBase58());
      if (after >= minSol) return after;
    } catch (error) {
      lastError = error;
    }

    await sleep(1200 * attempt);

    const afterRetry = await getBalance(keypair.publicKey.toBase58()).catch(
      () => 0,
    );
    if (afterRetry >= minSol) return afterRetry;
  }

  const finalBal = await getBalance(keypair.publicKey.toBase58()).catch(
    () => 0,
  );
  if (finalBal >= minSol) return finalBal;

  const address = keypair.publicKey.toBase58();
  const reason =
    lastError instanceof Error ? lastError.message : "unknown airdrop error";
  throw new Error(
    `Unable to fund ${address} to ${minSol} SOL via airdrop (${reason}). ` +
      `Try: solana airdrop 2 ${address} --url devnet`,
  );
}

async function sendPayment({ fromKeypair, toPublicKey, amountSOL, memo }) {
  const lamports = Math.floor(Number(amountSOL) * LAMPORTS_PER_SOL);
  if (!Number.isFinite(lamports) || lamports <= 0) {
    throw new Error("amountSOL must be a positive number");
  }

  const tx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: fromKeypair.publicKey,
      toPubkey: new PublicKey(toPublicKey),
      lamports,
    }),
  );

  if (memo) {
    tx.add(
      new TransactionInstruction({
        keys: [],
        programId: new PublicKey(MEMO_PROGRAM_ID),
        data: Buffer.from(memo, "utf8"),
      }),
    );
  }

  return sendAndConfirmTransaction(connection, tx, [fromKeypair], {
    commitment: SOLANA_COMMITMENT,
  });
}

function decodeMemoData(data) {
  if (!data) return "";
  if (Buffer.isBuffer(data)) return data.toString("utf8");
  if (data instanceof Uint8Array) return Buffer.from(data).toString("utf8");
  if (typeof data === "string") {
    try {
      return Buffer.from(bs58.decode(data)).toString("utf8");
    } catch {
      return "";
    }
  }
  return "";
}

function getMessageAccountKeys(message) {
  const keys = message.staticAccountKeys || message.accountKeys || [];
  return keys.map((k) => {
    if (typeof k === "string") return k;
    if (k && typeof k.toBase58 === "function") return k.toBase58();
    if (k && k.pubkey && typeof k.pubkey.toBase58 === "function")
      return k.pubkey.toBase58();
    return String(k);
  });
}

function getMessageInstructions(message) {
  if (Array.isArray(message.compiledInstructions))
    return message.compiledInstructions;
  if (Array.isArray(message.instructions)) return message.instructions;
  return [];
}

async function verifyPayment({
  txSignature,
  expectedRecipient,
  expectedAmountSOL,
  expectedMemo,
  maxAgeMs = 10 * 60 * 1000,
}) {
  try {
    const tx = await connection.getTransaction(txSignature, {
      commitment: SOLANA_COMMITMENT,
      maxSupportedTransactionVersion: 0,
    });

    if (!tx) return { valid: false, reason: "transaction not found" };
    if (tx.meta && tx.meta.err)
      return { valid: false, reason: "transaction failed" };
    if (!tx.blockTime) return { valid: false, reason: "missing block time" };

    const txAgeMs = Date.now() - tx.blockTime * 1000;
    if (txAgeMs > maxAgeMs)
      return { valid: false, reason: "transaction too old" };

    const accountKeys = getMessageAccountKeys(tx.transaction.message);
    const recipientIndex = accountKeys.findIndex(
      (k) => k === expectedRecipient,
    );
    if (recipientIndex < 0) {
      return { valid: false, reason: "recipient not in transaction" };
    }

    const pre = tx.meta.preBalances?.[recipientIndex];
    const post = tx.meta.postBalances?.[recipientIndex];
    if (typeof pre !== "number" || typeof post !== "number") {
      return { valid: false, reason: "recipient balance not readable" };
    }

    const receivedLamports = post - pre;
    const requiredLamports = Math.floor(
      Number(expectedAmountSOL) * LAMPORTS_PER_SOL * 0.99,
    );
    if (receivedLamports < requiredLamports) {
      return { valid: false, reason: "received amount too low" };
    }

    if (expectedMemo) {
      const instructions = getMessageInstructions(tx.transaction.message);
      let memoMatched = false;
      for (const ix of instructions) {
        if (typeof ix.programIdIndex !== "number") continue;
        const programId = accountKeys[ix.programIdIndex];
        if (programId !== MEMO_PROGRAM_ID) continue;
        const memo = decodeMemoData(ix.data);
        if (memo === expectedMemo) {
          memoMatched = true;
          break;
        }
      }

      if (!memoMatched) {
        return { valid: false, reason: "memo mismatch" };
      }
    }

    return {
      valid: true,
      txSignature,
      receivedSOL: Number((receivedLamports / LAMPORTS_PER_SOL).toFixed(9)),
      explorerUrl: `https://explorer.solana.com/tx/${txSignature}?cluster=devnet`,
    };
  } catch (error) {
    return {
      valid: false,
      reason: error instanceof Error ? error.message : "verification error",
    };
  }
}

async function printAllBalances() {
  const agents = loadAllAgents();
  console.log("\nAgent balances:");
  for (const row of Object.values(agents)) {
    const balance = await getBalance(row.publicKey);
    console.log(`- ${row.name}: ${balance.toFixed(6)} SOL (${row.publicKey})`);
  }
}

module.exports = {
  connection,
  SOLANA_RPC_URL,
  SOLANA_COMMITMENT,
  MEMO_PROGRAM_ID,
  getAgentsFilePath,
  loadAgentKeypair,
  loadAllAgents,
  getBalance,
  ensureMinBalance,
  sendPayment,
  verifyPayment,
  printAllBalances,
};
