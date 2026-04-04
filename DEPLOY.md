# Deployment Guide — Vercel

> **Deploy the Agentic Commerce frontend to Vercel in less than 5 minutes.**

## 📑 Prerequisites
-   A Vercel account.
-   GitHub repository for the project.
-   Access To API credentials (Vultr, Gemini, ArmorIQ).

---

## 🚀 Steps to Deploy

### 1. New Project on Vercel
1.  Go to [Vercel Dashboard](https://vercel.com/dashboard) and click **"Add New"** → **"Project"**.
2.  Import the GitHub repository: `Agent-Commerce`.

### 2. Configure Build Settings
The project uses a monorepo-style structure. You **MUST** tell Vercel to look inside the `frontend` directory:

1.  **Root Directory**: Set to `frontend`.
2.  **Framework Preset**: Select `Next.js`.
3.  **Build Command**: `npm run build`.
4.  **Output Directory**: `.next`.

### 3. Environment Variables
Add the following keys to the **Environment Variables** section:

| Variable | Description |
|:--- |:--- |
| `GEMINI_API_KEY` | Your Google AI Studio API key. |
| `VULTR_API_KEY` | Your Vultr account API key (for serverless inference). |
| `SPACETIMEDB_URL` | The live URL of your SpacetimeDB instance. |
| `ARMORIQ_API_KEY` | Your ArmorIQ firewall API key. |
| `NEXT_PUBLIC_SOLANA_NETWORK` | Set to `devnet`. |
| `NEXT_PUBLIC_RPC_URL` | (Optional) Custom Solana RPC URL. |

### 4. Deploy!
Click **"Deploy"**. Vercel will build the Next.js application and provide a production URL.

---

## 🔧 Post-Deployment Check
1.  **CORS**: Ensure your SpacetimeDB and ArmorIQ endpoints allow requests from your new Vercel domain.
2.  **Airdrops**: Remember to manually airdrop SOL to the agent's Devnet wallets if you initialize them via the `/api/wallets/init` endpoint.
3.  **Inference Latency**: Check Vercel's Edge locations for optimal performance with Vultr's global clusters.

---

## 🌍 Production Best Practices
-   **SSL**: Vercel handles SSL automatically.
-   **Caching**: The `tracks` and `home` pages are static by default; the simulation is dynamic (SSR/Poll).
-   **Logs**: Check the Vercel logs if the Simulation Engine polling fails.

---

MIT © 2026
