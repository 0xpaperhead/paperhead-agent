# Paperhead – AI-Powered Solana Trading Agent

Paperhead is an **experimental, fully-autonomous crypto trading agent** built with TypeScript & Node.js.  
It analyses real-time news, on-chain data and market sentiment to automatically generate trading decisions for the **Solana** ecosystem and execute them on-chain through the [GOAT SDK](https://github.com/goat-sdk/goat).

> ⚠️  **DISCLAIMER**  
> This project is **research / educational** material and **NOT** financial advice.  
> You are fully responsible for any funds you connect to this bot. Use at your own risk.

---

## ✨ Features

• **Agentic Architecture** – multi-step reasoning powered by OpenAI GPT-4o.  
• **Market Intelligence** – aggregates crypto news, "Fear & Greed" index, social sentiment & trending topics.  
• **On-Chain Execution** – swaps SOL & SPL tokens using Jupiter & Orca liquidity routes.  
• **Dynamic Portfolio Builder** – AI generates risk-balanced token baskets and rebalances every few hours.  
• **Full TypeScript Codebase** – strict types, ESLint, Prettier, Jest unit tests.  
• **Cross-Platform Dev Scripts** – `dev` (Unix) & `windev` (Windows).

---

## 🚀 Quick start

```bash
# 1. Clone
$ git clone https://github.com/<your-fork>/paperhead-agent.git
$ cd paperhead-agent

# 2. Install dependencies
$ npm install

# 3. Configure environment
$ cp .env.example .env     # or create .env manually (see below)
$ code .env                # add all required keys

# 4. Run in development (hot-reload)
$ npm run dev              # macOS / Linux
#  or
$ npm run windev           # Windows PowerShell

# 5. Build & start in production
$ npm run build && npm start
```

> **Node.js 18+** is required because the project relies on native `fetch` and ES modules.

---

## 🔧 Environment variables

Create a `.env` file in the project root and provide **all** variables below.  
An incomplete configuration will cause the bot to crash at start-up.

```dotenv
# ─────────────────────────────────────────────
# General
NODE_ENV=development          # development | production | test
PORT=8080                     # optional – only relevant if you expose a REST API
INTERNAL_API_KEY=changeme     # arbitrary string for internal auth

# ─────────────────────────────────────────────
# OpenAI (required for all AI features)
OPENAI_API_KEY=sk-...

# ─────────────────────────────────────────────
# Solana & Trading
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
SOLANA_PRIVATE_KEY=...        # base58-encoded private key **loaded in memory**
SOLANA_TRACKER_API_KEY=...    # https://solanatracker.io/ (used by TrendingTokensService)

# ─────────────────────────────────────────────
# External Data Providers
RAPID_API_KEY=...             # https://rapidapi.com/
MORALIS_API_KEY=...           # https://moralis.io/
```

> Never commit `.env` to version control – it contains private keys!

---

## 📜 NPM scripts

| Command            | Description                                   |
|--------------------|-----------------------------------------------|
| `npm run dev`      | Start the bot in watch-mode (Unix)            |
| `npm run windev`   | Start the bot in watch-mode (Windows)         |
| `npm run build`    | Transpile TypeScript → `dist/`                |
| `npm start`        | Launch compiled code (`dist/main.js`)         |
| `npm test`         | Run Jest test suite                           |
| `npm run lint`     | ESLint with @typescript-eslint rules          |
| `npm run format`   | Auto-format repo via Prettier                 |
| `npm run clean`    | Remove build artefacts                        |

---

## 🗂️  Project structure

```text
└─ src/
   ├─ agent/               # Agentic core (decision loops, execution)
   │   └─ agenticSystem.ts
   ├─ services/            # Domain services (news, tokens, portfolio …)
   ├─ libs/                # Helpers (config loader, utilities)
   ├─ types/               # Shared TypeScript types
   └─ main.ts              # Entry point – starts the infinite loop
```

Key file to explore: **`src/agent/agenticSystem.ts`** – 800+ lines that orchestrate all services, generates decisions & executes trades.

---

## 🏗️  Architecture overview

1. **Data Ingestion** – `NewsService`, `TrendingTokensService`, etc. fetch external data in parallel.  
2. **Analysis** – `TrendAnalyzer` aggregates scores, detects momentum, calculates sentiment and Fear & Greed trends.  
3. **Portfolio** – `PortfolioService` builds equal-allocation baskets based on risk profile (`conservative`, `moderate`, `aggressive`).  
4. **Decision Making** – `AgenticSystem` feeds a GPT-4o model a comprehensive market report and asks for a JSON-structured action (`buy` / `sell` / `hold`).  
5. **Execution** – When confidence ≥ 70 % the bot routes swaps through Jupiter/Orca pools using the GOAT SDK.

---

## 🧪 Testing

```bash
# Run all tests once
$ npm test

# Watch mode
$ npm run test:watch
```

Unit tests live under `__tests__/` or alongside source files.

---

## 🖋️  Coding standards

• **ESLint** with the TypeScript plugin – `npm run lint`  
• **Prettier** for formatting – `npm run format`  
• **Conventional Commits** are recommended (`feat:`, `fix:`, etc.).

---

## 🤝 Contributing

Pull requests are welcome!  
Please open an issue to discuss major changes first.  
Make sure to run `npm run lint && npm test` before submitting.

---

## ⚖️ License

This repository is licensed under the **MIT License**. See `LICENSE` for details.