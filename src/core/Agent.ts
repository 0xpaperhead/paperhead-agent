import { getOnChainTools } from "@goat-sdk/adapter-vercel-ai";
import { jupiter } from "@goat-sdk/plugin-jupiter";
import { orca } from "@goat-sdk/plugin-orca";
import { splToken } from "@goat-sdk/plugin-spl-token";
import { sendSOL, solana } from "@goat-sdk/wallet-solana";
import { AgentState, PortfolioAnalysis } from "../types/index.js";
import { SolanaService } from "./SolanaService.js";
import { MarketAnalyzer } from "../analysis/MarketAnalyzer.js";
import { PortfolioManager } from "./PortfolioManager.js";
import { TradeExecutor } from "./TradeExecutor.js";
import { PortfolioService } from "../analysis/portfolioService.js";
import { TrendAnalyzer } from "../analysis/trendAnalyzer.js";
import { TrendingTokensService } from '../analysis/trendingTokensService.js';
import { NewsService } from '../analysis/newsService.js';
import { TopicGenerator } from '../analysis/topicGenerator.js';
import { displayTradingConfig } from '../config/trading.js';
import { RiskProfile, RiskProfileInfo } from '../analysis/RiskProfile.js'

export class Agent {
  private solanaService: SolanaService;
  private marketAnalyzer: MarketAnalyzer;
  private portfolioManager!: PortfolioManager;
  private tradeExecutor!: TradeExecutor;
  private tools: any;

  // Services
  private newsService: NewsService;
  private topicGenerator: TopicGenerator;
  private trendAnalyzer: TrendAnalyzer;
  private trendingTokensService: TrendingTokensService;
  private portfolioService: PortfolioService;

  // Configuration
  private defaultRiskProfile: RiskProfile;

  private state: AgentState = {
    isRunning: false,
    lastUpdate: 0,
    currentTopics: [],
    sentimentHistory: [],
    trendAnalysis: [],
    lastDecision: undefined
  };

  constructor(riskProfile: RiskProfile) {
    // Use provided risk profile, or fall back to config
    this.defaultRiskProfile = riskProfile;
    this.solanaService = new SolanaService();
    
    // Instantiate all services once
    this.newsService = new NewsService();
    this.topicGenerator = new TopicGenerator();
    this.trendAnalyzer = new TrendAnalyzer();
    this.trendingTokensService = new TrendingTokensService();
    this.portfolioService = new PortfolioService(this.trendingTokensService, this.trendAnalyzer);

    this.marketAnalyzer = new MarketAnalyzer(this.newsService, this.topicGenerator, this.trendAnalyzer, this.trendingTokensService);
  }

  async initialize(): Promise<void> {
    console.log("\n🎭 PAPERHEAD AGENTIC TRADING SYSTEM INITIALIZATION");
    console.log("💰 Automatic Portfolio Rebalancing System");
    console.log("🎯 AI-Powered Token Selection Strategy");
    console.log("🔄 Intelligent Buy/Sell Based on Market Analysis\n");

    console.log("🚀 Initializing system components...");
    console.log("─".repeat(60));

    // Initialize Solana connection
    console.log("🔗 Connecting to Solana blockchain...");
    const walletAddress = this.solanaService.getWalletPublicKey().toBase58();
    const walletBalance = await this.solanaService.getWalletBalance();
    console.log(`✅ Solana Service initialized. Wallet: ${walletAddress}`);
    console.log(`💰 Current Balance: ${walletBalance.toFixed(4)} SOL`);

    // Initialize trading tools
    console.log("\n🛠️ Setting up trading infrastructure...");
    const wallet = solana({
        keypair: this.solanaService.keypair,
        connection: this.solanaService.connection,
    });
    const { tool } = await getOnChainTools({
        wallet,
        plugins: [sendSOL(), splToken(), jupiter(), orca()],
    });
    this.tools = tool;
    console.log("✅ Trading tools initialized (sendSOL, splToken, jupiter, orca)");

    this.tradeExecutor = new TradeExecutor(this.solanaService, this.tools);

    this.portfolioManager = new PortfolioManager(
        this.portfolioService,
        this.tradeExecutor,
        this.solanaService,
        this.marketAnalyzer,
        this.trendAnalyzer
    );
    
    // Configuration summary
    console.log("\n⚙️ SYSTEM CONFIGURATION:");
    console.log(`   🎯 Default Risk Profile: ${this.defaultRiskProfile.level.toUpperCase()}`);
    console.log(`   🔄 Update Interval: ${this.getUpdateIntervalDisplay()}`);
    console.log(`   📊 Market Analysis: Comprehensive (News + Sentiment + Fear&Greed + Tokens)`);
    console.log(`   🪙 Token Sources: Solana Tracker API`);
    
    // Show detailed trading configuration
    console.log(displayTradingConfig(this.defaultRiskProfile.tradingConfig));
    
    // Start comprehensive market analysis
    console.log("\n📊 Performing initial market analysis...");
    await this.marketAnalyzer.performFullAnalysis();
    
    // Generate initial portfolio
    console.log("\n💼 Generating initial portfolio...");
    await this.portfolioManager.generatePortfolioNow(this.defaultRiskProfile, 10);

    console.log("\n✅ Agent initialized successfully!");
    console.log("🔄 Ready for autonomous trading operations");
    console.log("─".repeat(60));
  }

  // Helper method to get update interval display
  private getUpdateIntervalDisplay(): string {
    const config = this.defaultRiskProfile.tradingConfig;
    const hours = Math.round(config.portfolioUpdateIntervalMs / (60 * 60 * 1000));
    
    const frequencyMap = {
      'conservative': 'low frequency',
      'moderate': 'standard',
      'aggressive': 'high frequency'
    };
    
    return `${hours} hours (${frequencyMap[this.defaultRiskProfile.level]})`;
  }

  // Get comprehensive risk profile information
  public getRiskProfileInfo(): RiskProfileInfo  {
    return this.defaultRiskProfile.riskProfileInfo;
  }

  public start(): void {
    if (this.state.isRunning) return;
    this.state.isRunning = true;
    console.log("🎯 Starting Agent Loop...");
    this.runMainLoop();
  }

  public stop(): void {
    this.state.isRunning = false;
    console.log("🛑 Agent stopped");
  }

  private async runMainLoop(): Promise<void> {
    let cycleCount = 0;
    
    while (this.state.isRunning) {
      try {
        cycleCount++;
        console.log(`\n🔄 ANALYSIS CYCLE #${cycleCount}`);
        console.log("=".repeat(60));
        console.log(`⏰ Time: ${new Date().toLocaleString()}`);
        
        // Always perform market analysis (it's cached and efficient)
        await this.marketAnalyzer.performFullAnalysis();
        
        // Check if portfolio needs update based on timing and market conditions
        if (this.portfolioManager.shouldUpdatePortfolio()) {
          console.log("✅ Portfolio update triggered");
          await this.portfolioManager.performPortfolioRebalancing();
        } else {
          const nextUpdate = this.portfolioManager.getNextUpdateTime();
          console.log(`⏳ Next portfolio update in: ${this.formatTimeRemaining(nextUpdate)}`);
        }

        this.state.lastUpdate = Date.now();
        
        // Log next cycle timing
        console.log(`\n⏰ Next analysis in 1 hour`);
        console.log("=".repeat(60));
        
        // Wait for next cycle (1 hour)
        await new Promise(resolve => setTimeout(resolve, 60 * 60 * 1000));
      } catch (error) {
        console.error("❌ Error in analysis cycle:", error);
        console.log("⏳ Retrying in 5 minutes...");
        await new Promise(resolve => setTimeout(resolve, 5 * 60 * 1000));
      }
    }
  }
  
  private formatTimeRemaining(nextUpdateTime: number): string {
    const remaining = nextUpdateTime - Date.now();
    const hours = Math.floor(remaining / (60 * 60 * 1000));
    const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
    return `${hours}h ${minutes}m`;
  }

  // Public getters for state
  public getState(): AgentState { return this.state; }
  public getCurrentPortfolio(): PortfolioAnalysis | null {
      return this.portfolioManager.getCurrentPortfolio();
  }

  // Public methods for portfolio management (delegating to PortfolioManager)
  public async generatePortfolioNow(riskProfile: RiskProfile, tokenCount: number = 10): Promise<PortfolioAnalysis> {
    return this.portfolioManager.generatePortfolioNow(riskProfile, tokenCount);
  }

  public getLastPortfolioUpdate(): number {
    return this.portfolioManager.getLastPortfolioUpdate();
  }

  public setLastPortfolioUpdate(timestamp: number): void {
    this.portfolioManager.setLastPortfolioUpdate(timestamp);
  }

  public forcePortfolioRebalancing(): void {
    this.portfolioManager.forcePortfolioRebalancing();
  }

  public async triggerRebalancingNow(): Promise<void> {
    await this.portfolioManager.performPortfolioRebalancing();
  }

  // Risk profile management
  public getDefaultRiskProfile(): RiskProfile {
    return this.defaultRiskProfile;
  }

  public setDefaultRiskProfile(riskProfile: RiskProfile): void {
    this.defaultRiskProfile = riskProfile;
    console.log(`🎯 Default risk profile updated to: ${riskProfile.level.toUpperCase()}`);
  }

  // Generate portfolio with default risk profile
  public async generateDefaultPortfolio(tokenCount: number = 10): Promise<PortfolioAnalysis> {
    return this.generatePortfolioNow(this.defaultRiskProfile, tokenCount);
  }

  // Display current trading configuration
  public displayCurrentTradingConfig(): void {
    const config = this.defaultRiskProfile.tradingConfig;
    console.log(`\n🔧 CURRENT TRADING CONFIGURATION (${this.defaultRiskProfile.level.toUpperCase()}):`);
    console.log(displayTradingConfig(config));
  }
}
