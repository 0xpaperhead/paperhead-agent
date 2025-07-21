import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";
import { AgentDecision } from "../types/index.js";
import { SolanaService } from "./SolanaService.js";
import { isValidSolanaAddress } from "../utils/validation.js";

export class TradeExecutor {
  private solanaService: SolanaService;
  private tools: any;

  constructor(solanaService: SolanaService, tools: any) {
    this.solanaService = solanaService;
    this.tools = tools;
    console.log("✅ Trade Executor initialized.");
  }

  public async executeDecision(decision: AgentDecision): Promise<void> {
    try {
      const safeAmount = Math.floor(decision.amount ?? 0);
      console.log(`\n🎯 Executing Decision: ${decision.action.toUpperCase()}`);
      console.log(`💰 Token Contract: ${decision.token || 'N/A'}`);
      console.log(`📊 Amount: ${safeAmount}% (integer only)`);
      console.log(`🎯 Confidence: ${decision.confidence}%`);
      console.log(`💭 Reasoning: ${decision.reasoning}\n`);

      if (decision.action === 'hold') {
        console.log("⏸️ Holding position - no trade executed");
        return;
      }

      if (decision.token && !isValidSolanaAddress(decision.token)) {
        console.log(`❌ INVALID MINT ADDRESS: ${decision.token}`);
        console.log(`💡 Mint addresses must be valid base58-encoded Solana public keys`);
        console.log(`⏸️ Trade cancelled due to invalid address\n`);
        return;
      }

      const currentBalance = await this.solanaService.getWalletBalance();
      const currentBalanceLamports = Math.floor(currentBalance * 1e9);
      const maxTradeAmountLamports = Math.floor(currentBalanceLamports * safeAmount / 100);

      console.log(`\n🛡️ SAFETY CHECK:`);
      console.log(`   💰 Current balance: ${currentBalance.toFixed(4)} SOL (${currentBalanceLamports} lamports)`);
      console.log(`   📊 Max trade amount: ${safeAmount}% = ${(maxTradeAmountLamports / 1e9).toFixed(4)} SOL (${maxTradeAmountLamports} lamports)`);

      if (maxTradeAmountLamports > currentBalanceLamports * 0.99) { // Leave 1% for fees
        console.log(`   ❌ TRADE REJECTED: Not enough balance for ${safeAmount}% trade`);
        return;
      }

      console.log(`   ✅ Trade amount safe - proceeding with execution\n`);

      console.log("🤖 Executing trade with AI agent...");
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('AI agent timeout after 60 seconds')), 60000);
      });

      const generateTextPromise = generateText({
        model: openai("gpt-4o-mini"),
        tools: this.tools,
        maxSteps: 5,
        prompt: `You are a crypto trading assistant. Execute this trade quickly and efficiently.

CONTRACT ADDRESS: ${decision.token}
ACTION: ${decision.action.toUpperCase()}
AMOUNT: ${safeAmount}% of SOL balance

CRITICAL: ALL amounts must be INTEGERS - never use decimals.

INSTRUCTIONS:
1. Check SOL balance in lamports (integer)
2. ${decision.action === 'buy' ?
    `Calculate ${safeAmount}% of SOL balance: Math.floor(balance_lamports * ${safeAmount} / 100) and buy tokens with address ${decision.token}` :
    `Sell ${safeAmount}% of tokens with address ${decision.token}`}
3. Execute trade with INTEGER amount only
4. Report result

Use the exact contract address: ${decision.token}`
      });

      const result = await Promise.race([generateTextPromise, timeoutPromise]) as any;

      console.log("\n💼 Trade Execution Result:");
      console.log(result.text);

    } catch (error) {
      console.error("❌ Error executing decision:", error);
    }
  }
}
