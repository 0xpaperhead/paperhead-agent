/* eslint-disable @typescript-eslint/no-explicit-any */
import { PortfolioService } from "../analysis/portfolioService.js";
import { TradeExecutor } from "./TradeExecutor.js";
import { SolanaService } from "./SolanaService.js";
import { MarketAnalyzer } from "../analysis/MarketAnalyzer.js";
import {
  PortfolioAnalysis,
  TradingConfiguration,
  AgentDecision,
  RiskProfile,
  AgentTradeAction,
} from "../types/index.js";
import { getTradingConfigByRiskProfile, displayTradingConfig } from "../config/trading.js";
import { isValidSolanaAddress } from "../utils/validation.js";
import { TrendAnalyzer } from "../analysis/trendAnalyzer.js";

export class PortfolioManager {
  private portfolioService: PortfolioService;
  private tradeExecutor: TradeExecutor;
  private solanaService: SolanaService;
  private marketAnalyzer: MarketAnalyzer;
  private trendAnalyzer: TrendAnalyzer;

  private currentPortfolio: PortfolioAnalysis | null = null;
  private lastPortfolioUpdate: number = 0;
  private tradingConfig: TradingConfiguration;

  constructor(
    portfolioService: PortfolioService,
    tradeExecutor: TradeExecutor,
    solanaService: SolanaService,
    marketAnalyzer: MarketAnalyzer,
    trendAnalyzer: TrendAnalyzer,
  ) {
    this.portfolioService = portfolioService;
    this.tradeExecutor = tradeExecutor;
    this.solanaService = solanaService;
    this.marketAnalyzer = marketAnalyzer;
    this.trendAnalyzer = trendAnalyzer;
    //TODO: Why is this hardcoded?
    this.tradingConfig = getTradingConfigByRiskProfile("moderate");
    console.log("✅ Portfolio Manager initialized.");
  }

  public getCurrentPortfolio(): PortfolioAnalysis | null {
    return this.currentPortfolio;
  }

  public getLastPortfolioUpdate(): number {
    return this.lastPortfolioUpdate;
  }

  public setLastPortfolioUpdate(timestamp: number): void {
    this.lastPortfolioUpdate = timestamp;
  }

  public getNextUpdateTime(): number {
    return this.lastPortfolioUpdate + this.tradingConfig.portfolioUpdateIntervalMs;
  }

  public forcePortfolioRebalancing(): void {
    const oldTimestamp = Date.now() - (this.tradingConfig.portfolioUpdateIntervalMs + 1000);
    this.lastPortfolioUpdate = oldTimestamp;
  }

  private async reconcileWalletWithPortfolio(portfolio: PortfolioAnalysis): Promise<void> {
    //TODO refactor trading logic
    console.log("\n🔄 WALLET RECONCILIATION:");
    console.log("=".repeat(60));

    const walletBalances = await this.solanaService.getAllTokenBalances();
    const desiredMints = new Set(portfolio.portfolio.tokens.map(t => t.mint));

    const tokensToSell: Array<{ mint: string; balance: number }> = [];
    walletBalances.forEach((balance, mint) => {
      if (!desiredMints.has(mint) && balance > 0) {
        tokensToSell.push({ mint, balance });
      }
    });

    const tokensToBuy: Array<{ mint: string; symbol: string }> = [];
    for (const token of portfolio.portfolio.tokens) {
      if (!walletBalances.has(token.mint) || walletBalances.get(token.mint)! <= 0) {
        tokensToBuy.push({ mint: token.mint, symbol: token.symbol });
      }
    }

    if (tokensToSell.length === 0 && tokensToBuy.length === 0) {
      console.log("✅ Wallet already aligned with desired portfolio – no trades required.");
      console.log("=".repeat(60));
      return;
    }

    // 1. SELL unwanted tokens first (free up SOL)
    for (const sell of tokensToSell) {
      console.log(`🔴 Preparing SELL decision for ${sell.mint} | Balance: ${sell.balance.toFixed(4)}`);
      const decision: AgentDecision = {
        action: AgentTradeAction.Sell,
        token: sell.mint,
        amount: sell.balance, // sell entire balance
        confidence: 95,
        reasoning: "Rebalancing: token not in desired portfolio",
        timestamp: Date.now(),
      };
      await this.tradeExecutor.executeDecision(decision);
    }

    // Refresh available SOL after sells
    const availableSol = (await this.solanaService.getWalletBalance()) * 0.99; // keep small buffer
    const buyBudgetPerToken = tokensToBuy.length > 0 ? availableSol / tokensToBuy.length : 0;

    // 2. BUY missing desired tokens
    for (const buy of tokensToBuy) {
      console.log(`🟢 Preparing BUY decision for ${buy.symbol} | Budget: ${buyBudgetPerToken.toFixed(4)} SOL`);
      const decision: AgentDecision = {
        action: AgentTradeAction.Buy,
        token: buy.mint,
        amount: buyBudgetPerToken,
        confidence: 90,
        reasoning: "Rebalancing: acquire token to match desired portfolio",
        timestamp: Date.now(),
      };
      await this.tradeExecutor.executeDecision(decision);
    }

    console.log("\n✅ Wallet reconciliation trades executed (sell then buy). Portfolio should now be aligned.");
    console.log("=".repeat(60));
  }

  public async generatePortfolioNow(riskProfile: RiskProfile, tokenCount: number = 10): Promise<PortfolioAnalysis> {
    // Get cached trend analysis from market analyzer state
    const cachedTrendAnalysis = this.marketAnalyzer.getAgentState().trendAnalysis;
    const portfolioAnalysis = await this.portfolioService.generateEqualAllocationPortfolio(
      tokenCount,
      riskProfile,
      cachedTrendAnalysis,
    );

    // Set the current portfolio and update timestamp
    this.currentPortfolio = portfolioAnalysis;
    this.lastPortfolioUpdate = Date.now();

    console.log(
      `\n✅ PORTFOLIO SET: currentPortfolio is now populated with ${portfolioAnalysis.portfolio.tokens.length} tokens`,
    );
    console.log(`⏰ Portfolio timestamp: ${new Date(this.lastPortfolioUpdate).toLocaleString()}`);

    this.printPortfolioSummary(portfolioAnalysis);

    // Reconcile wallet with newly generated portfolio
    await this.reconcileWalletWithPortfolio(portfolioAnalysis);

    return portfolioAnalysis;
  }

  public shouldUpdatePortfolio(): boolean {
    console.log("\n🔍 PORTFOLIO UPDATE EVALUATION:");
    console.log("-".repeat(50));

    // Log current portfolio status
    if (this.currentPortfolio) {
      console.log("📋 CURRENT PORTFOLIO STATUS:");
      console.log(`   🪙 Tokens: ${this.currentPortfolio.portfolio.tokens.length}`);
      console.log(`   📅 Created: ${new Date(this.currentPortfolio.portfolio.metadata.createdAt).toLocaleString()}`);
      console.log(`   🎯 Strategy: ${this.currentPortfolio.portfolio.metadata.strategy}`);
      console.log(`   ⚠️ Risk Profile: ${this.currentPortfolio.portfolio.metadata.riskProfile}`);
      console.log(`   💰 Current Holdings:`);
      this.currentPortfolio.portfolio.tokens.slice(0, 5).forEach((token, index) => {
        console.log(`      ${index + 1}. ${token.symbol}: ${token.allocation}% (Risk: ${token.riskScore}/10)`);
      });
      if (this.currentPortfolio.portfolio.tokens.length > 5) {
        console.log(`      ... and ${this.currentPortfolio.portfolio.tokens.length - 5} more tokens`);
      }
    } else {
      console.log("📋 CURRENT PORTFOLIO STATUS: ❌ No portfolio exists");
    }

    const timeSinceLastUpdate = Date.now() - this.lastPortfolioUpdate;
    const hoursElapsed = Math.round(timeSinceLastUpdate / (60 * 60 * 1000));
    const requiredHours = Math.round(this.tradingConfig.portfolioUpdateIntervalMs / (60 * 60 * 1000));

    console.log(`⏰ Time since last update: ${hoursElapsed}h (Required: ${requiredHours}h)`);

    if (!this.currentPortfolio) {
      console.log("📝 ✅ TRIGGER: No portfolio exists - generating initial portfolio");
      return true;
    }

    if (timeSinceLastUpdate > this.tradingConfig.portfolioUpdateIntervalMs) {
      console.log("⏰ ✅ TRIGGER: Portfolio update interval reached - refreshing portfolio");
      return true;
    }

    // Use cached data to avoid duplicate trend analysis calls
    const cachedTrendAnalysis = this.marketAnalyzer.getAgentState().trendAnalysis;
    const stats = this.trendAnalyzer.getSummaryStatsFromCache(cachedTrendAnalysis || []);

    const fearGreedTrend = this.trendAnalyzer.getFearGreedTrend();
    const fearGreedChange = fearGreedTrend.current?.change ?? 0;

    console.log(`📊 Market condition: ${stats.marketCondition.toUpperCase()}`);
    console.log(`😱 Fear & Greed change: ${fearGreedChange > 0 ? "+" : ""}${fearGreedChange}`);

    if (stats.marketCondition === "bearish") {
      console.log("🚨 ✅ TRIGGER: Bearish market conditions detected - defensive rebalancing needed");
      return true;
    }

    if (fearGreedTrend.current && Math.abs(fearGreedChange) > 20) {
      console.log(`🚨 ✅ TRIGGER: Major Fear & Greed shift (${fearGreedChange}) - sentiment-based rebalancing needed`);
      return true;
    }

    console.log("✋ ❌ NO TRIGGER: Market conditions stable - maintaining current portfolio");
    console.log("-".repeat(50));
    return false;
  }

  private async comparePortfolios(currentPortfolio: PortfolioAnalysis, newPortfolio: PortfolioAnalysis): Promise<void> {
    console.log("\n🔄 PORTFOLIO COMPARISON:");
    console.log("=".repeat(60));

    const currentTokens = currentPortfolio.portfolio.tokens;
    const newTokens = newPortfolio.portfolio.tokens;

    console.log(`📊 Current Portfolio (${currentTokens.length} tokens) vs New Portfolio (${newTokens.length} tokens)`);

    // Find tokens to remove (in current but not in new)
    const currentMints = currentTokens.map(t => t.mint);
    const newMints = newTokens.map(t => t.mint);

    const tokensToRemove = currentTokens.filter(token => !newMints.includes(token.mint));
    const tokensToAdd = newTokens.filter(token => !currentMints.includes(token.mint));
    const tokensToKeep = currentTokens.filter(token => newMints.includes(token.mint));

    if (tokensToRemove.length > 0) {
      console.log("\n🔴 TOKENS TO REMOVE:");
      tokensToRemove.forEach((token, index) => {
        console.log(`   ${index + 1}. ${token.symbol} (${token.name})`);
        console.log(`      💰 Current allocation: ${token.allocation}%`);
        console.log(`      ⚠️ Risk: ${token.riskScore}/10 | Confidence: ${token.confidence}%`);
        console.log(`      💭 Reason: ${token.reasoning.substring(0, 60)}...`);
      });
    }

    if (tokensToAdd.length > 0) {
      console.log("\n🟢 TOKENS TO ADD:");
      tokensToAdd.forEach((token, index) => {
        console.log(`   ${index + 1}. ${token.symbol} (${token.name})`);
        console.log(`      💰 New allocation: ${token.allocation}%`);
        console.log(`      ⚠️ Risk: ${token.riskScore}/10 | Confidence: ${token.confidence}%`);
        console.log(`      💭 Reason: ${token.reasoning.substring(0, 60)}...`);
      });
    }

    if (tokensToKeep.length > 0) {
      console.log("\n🟡 TOKENS TO KEEP:");
      tokensToKeep.forEach((token, index) => {
        console.log(`   ${index + 1}. ${token.symbol}: ${token.allocation}% (unchanged)`);
      });
    }

    // Summary
    console.log("\n📈 REBALANCING SUMMARY:");
    console.log(`   ➖ Removing: ${tokensToRemove.length} tokens`);
    console.log(`   ➕ Adding: ${tokensToAdd.length} tokens`);
    console.log(`   🔄 Keeping: ${tokensToKeep.length} tokens`);
    console.log(`   📊 Total changes: ${tokensToRemove.length + tokensToAdd.length} tokens affected`);

    console.log("=".repeat(60));
  }

  public async performPortfolioRebalancing(): Promise<void> {
    try {
      console.log("\n💰 AUTOMATIC PORTFOLIO REBALANCING");
      console.log("=".repeat(60));

      // Get cached trend analysis to avoid duplicate calls
      const cachedTrendAnalysis = this.marketAnalyzer.getAgentState().trendAnalysis;
      const riskProfile = this.marketAnalyzer.determineRiskProfile();
      this.updateTradingConfig(riskProfile);

      console.log(`🎯 Risk Profile: ${riskProfile.toUpperCase()}`);
      const newPortfolio = await this.portfolioService.generateEqualAllocationPortfolio(
        10,
        riskProfile,
        cachedTrendAnalysis,
      );

      // Compare current vs new portfolio
      if (this.currentPortfolio) {
        await this.comparePortfolios(this.currentPortfolio, newPortfolio);
      } else {
        console.log("📝 No existing portfolio to compare - this is the initial portfolio generation");
      }

      // Reconcile wallet with new desired portfolio (this handles all trading)
      await this.reconcileWalletWithPortfolio(newPortfolio);

      // Update current portfolio and timestamp
      this.currentPortfolio = newPortfolio;
      this.lastPortfolioUpdate = Date.now();

      // Verify the portfolio was successfully created
      await this.verifyPortfolio(newPortfolio);

      // Print summary
      this.printPortfolioSummary(newPortfolio);
    } catch (error) {
      console.error("❌ Error in automatic portfolio rebalancing:", error);
    }
  }

  private async verifyPortfolio(targetPortfolio: PortfolioAnalysis): Promise<void> {
    try {
      console.log("\n🔍 PORTFOLIO VERIFICATION");
      console.log("-".repeat(50));

      let successCount = 0;
      const failedTokens: string[] = [];

      for (const token of targetPortfolio.portfolio.tokens) {
        if (!isValidSolanaAddress(token.mint)) {
          failedTokens.push(`${token.symbol} - Invalid address`);
          continue;
        }
        //TODO use getAllTokenBalances instead of fetching tokens one by one
        const tokenBalance = await this.solanaService.getTokenBalance(token.mint);
        if (tokenBalance > 0) {
          successCount++;
        } else {
          failedTokens.push(`${token.symbol} - No balance`);
        }
      }

      console.log(`✅ Successfully acquired: ${successCount}/${targetPortfolio.portfolio.tokens.length} tokens`);

      if (failedTokens.length > 0) {
        console.log(`⚠️ Failed tokens:`);
        failedTokens.forEach(token => console.log(`   - ${token}`));
      }

      console.log("-".repeat(50));
    } catch (error) {
      console.error("❌ Error in portfolio verification:", error);
    }
  }

  private updateTradingConfig(riskProfile: "conservative" | "moderate" | "aggressive"): void {
    const oldProfile = this.tradingConfig;
    this.tradingConfig = getTradingConfigByRiskProfile(riskProfile);

    // Show config change if it's different
    if (
      oldProfile.portfolioUpdateIntervalMs !== this.tradingConfig.portfolioUpdateIntervalMs ||
      oldProfile.maxRiskScore !== this.tradingConfig.maxRiskScore
    ) {
      console.log(`\n🔧 TRADING CONFIG UPDATED FOR ${riskProfile.toUpperCase()} PROFILE:`);
      console.log(displayTradingConfig(this.tradingConfig));
    }
  }

  private printPortfolioSummary(portfolioAnalysis: PortfolioAnalysis): void {
    const { portfolio, analysis } = portfolioAnalysis;
    console.log("\n💼 PORTFOLIO SUMMARY");
    console.log("=".repeat(50));
    console.log(`📝 ${portfolio.name}`);
    console.log(`🎯 Strategy: ${portfolio.metadata.strategy.replace("_", " ").toUpperCase()}`);
    console.log(`⚠️ Risk Profile: ${portfolio.metadata.riskProfile.toUpperCase()}`);
    console.log("\n🪙 SELECTED TOKENS:");
    portfolio.tokens.forEach((token, index) => {
      console.log(`${index + 1}. ${token.symbol} (${token.name})`);
      console.log(`   💰 Allocation: ${token.allocation.toFixed(1)}%`);
      console.log(`   💭 Reason: ${token.reasoning}`);
    });
    if (analysis.strengths.length > 0) {
      console.log("\n✅ STRENGTHS:");
      analysis.strengths.forEach(strength => console.log(`   • ${strength}`));
    }
    if (analysis.warnings.length > 0) {
      console.log("\n⚠️ WARNINGS:");
      analysis.warnings.forEach(warning => console.log(`   • ${warning}`));
    }
    console.log("=".repeat(50));
  }
}
