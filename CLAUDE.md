# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Paperhead is an autonomous AI-powered Solana trading agent built with TypeScript and Node.js. It continuously monitors the Solana ecosystem, analyzes market trends using GPT-4o, and executes trades through Jupiter/Orca DEX protocols via the GOAT SDK.

## Development Commands

### Core Commands
- `npm run dev` - Start development server with hot-reload (Unix/Linux/macOS)
- `npm run windev` - Start development server with hot-reload (Windows)
- `npm run dev:agent` - Start only the agent component in development mode
- `npm start` - Start production server
- `npm run build` - Build TypeScript to JavaScript (outputs to `dist/`)
- `npm run clean` - Remove build artifacts

### Testing
- `npm test` - Run Jest test suite
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage report
- `npm run test:file` - Run specific test file (use with `--testPathPattern`)

### Code Quality
- `npm run lint` - Run ESLint on TypeScript/JavaScript files
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check formatting without making changes

### Testing Framework
Jest is configured with ES modules support and TypeScript. Test files should be placed in `__tests__` directories or alongside source files with `.test.ts` extension.

## Architecture

### Core Components

**AgenticSystem** (`src/agent/agenticSystem.ts`) - Main orchestrator with dual-loop architecture:
- Main loop: Comprehensive market analysis every hour
- Quick loop: High-priority topic monitoring every 15 minutes
- Integrates all services, generates AI decisions, executes trades

**Services** (`src/services/`):
- `NewsService` - Fetches crypto news and sentiment data from RapidAPI
- `TopicGenerator` - Manages 90+ Solana topics + AI-powered dynamic topic discovery
- `TrendAnalyzer` - Historical trend analysis and momentum scoring
- `TrendingTokensService` - Tracks trending Solana tokens
- `PortfolioService` - Manages portfolio construction and rebalancing

**Trading Integration**:
- Uses GOAT SDK for Solana blockchain interaction
- Jupiter plugin for DEX aggregation
- Orca plugin for direct pool access
- Confidence-based execution (70% minimum threshold)

### Key Design Patterns

1. **Dual-Loop Architecture**: Separate fast/slow analysis cycles
2. **AI-Driven Topic Discovery**: GPT-4o-mini extracts trending topics from headlines
3. **Confidence-Based Trading**: Only executes trades with high confidence scores
4. **Risk Management**: Maximum 10% portfolio allocation per trade

## Environment Setup

Required environment variables (create `.env` file):
```
NODE_ENV=development
OPENAI_API_KEY=sk-...
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
SOLANA_PRIVATE_KEY=base58_encoded_private_key
RAPID_API_KEY=rapidapi_key
SOLANA_TRACKER_API_KEY=solanatracker_api_key
INTERNAL_API_KEY=arbitrary_auth_string
```

## Technical Stack

- **Runtime**: Node.js 18+ with ES modules
- **Language**: TypeScript with strict mode
- **AI Integration**: OpenAI GPT-4o via Vercel AI SDK
- **Blockchain**: Solana Web3.js + GOAT SDK
- **Testing**: Jest with ESM support
- **Linting**: ESLint with TypeScript rules
- **Formatting**: Prettier

## Entry Points

- `src/main.ts` - Production entry point, starts AgenticSystem
- `src/agent/index.ts` - Agent-only entry point for development
- `src/agent/agenticSystem.ts` - Core system logic (800+ lines)

## Key Files to Understand

- `src/agent/agenticSystem.ts` - Main system orchestrator
- `src/services/topicGenerator.ts` - AI-powered topic discovery
- `src/services/newsService.ts` - External data fetching
- `src/types/index.ts` - Core type definitions
- `AGENTIC_SYSTEM.md` - Detailed system architecture documentation