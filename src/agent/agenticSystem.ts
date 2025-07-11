import { Config } from "../libs/config.js";
import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";

import { getOnChainTools } from "@goat-sdk/adapter-vercel-ai";
import { jupiter } from "@goat-sdk/plugin-jupiter";
import { orca } from "@goat-sdk/plugin-orca";
import { splToken } from "@goat-sdk/plugin-spl-token";
import { sendSOL, solana } from "@goat-sdk/wallet-solana";

import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import base58 from "bs58";

import { NewsService } from "../services/newsService.js";
import { TopicGenerator } from "../services/topicGenerator.js";
import { TrendAnalyzer } from "../services/trendAnalyzer.js";
import { TrendingTokensService } from "../services/trendingTokensService.js";
import { PortfolioService } from "../services/portfolioService.js";
import { AgentState, AgentDecision, PortfolioAnalysis, TradingConfiguration } from "../types/index.js";
import { getTokenBalance, getAllTokenBalances } from "../utils/tokenUtils.js";
import { getTradingConfigByRiskProfile } from "../services/tradingConfig.js";

export class AgenticSystem {
  private newsService: NewsService;
  private topicGenerator: TopicGenerator;
  private trendAnalyzer: TrendAnalyzer;
  private trendingTokensService: TrendingTokensService;
  private portfolioService: PortfolioService;
  private tools: any;
  private connection!: Connection;
  private keypair!: Keypair;
  private tradingConfig: TradingConfiguration;
  
  private state: AgentState = {
    isRunning: false,
    lastUpdate: 0,
    currentTopics: [],
    sentimentHistory: [],
    trendAnalysis: [],
    lastDecision: undefined
  };

  // Portfolio state - now automatically rebalanced based on trading config
  private currentPortfolio: PortfolioAnalysis | null = null;
  private lastPortfolioUpdate = 0;


  // Configuration
  private readonly updateInterval = 24 * 60 * 60 * 1000; // 24 hours
  private readonly maxTopicsPerCycle = 15; // Limit to avoid API rate limits

  constructor() {
    this.newsService = new NewsService();
    this.topicGenerator = new TopicGenerator();
    this.trendAnalyzer = new TrendAnalyzer();
    this.trendingTokensService = new TrendingTokensService();
    this.portfolioService = new PortfolioService(this.trendingTokensService, this.trendAnalyzer);
    this.tradingConfig = getTradingConfigByRiskProfile('moderate'); // Default to moderate config
  }

  /**
   * Initialize the agentic system
   */
  async initialize(): Promise<void> {
    try {
      console.log("🚀 Initializing Paperhead Agentic System...\n");

      // Initialize blockchain connection
      this.connection = new Connection(Config.agent.solana_rpc_url);
      this.keypair = Keypair.fromSecretKey(base58.decode(Config.agent.solana_private_key));

      // Setup onchain tools
      console.log("🔧 Setting up blockchain tools...");
      this.tools = await getOnChainTools({
        wallet: solana({
          keypair: this.keypair,
          connection: this.connection,
        }),
        plugins: [
          sendSOL(),
          splToken(),
          jupiter(),
          orca()
        ],
      });
      console.log("✅ Blockchain tools initialized!\n");

      // Initial data collection
      await this.performInitialDataCollection();

      console.log("✅ Agentic System initialized successfully!\n");
    } catch (error) {
      console.error("❌ Failed to initialize agentic system:", error);
      throw error;
    }
  }

  /**
   * Start the agentic system loop
   */
  async start(): Promise<void> {
    if (this.state.isRunning) {
      console.log("⚠️ Agentic system is already running");
      return;
    }

    this.state.isRunning = true;
    console.log("🎯 Starting Agentic System Loop...\n");

    // Start the main loop
    this.runMainLoop();
  }

  /**
   * Stop the agentic system
   */
  stop(): void {
    this.state.isRunning = false;
    console.log("🛑 Agentic System stopped");
  }

  /**
   * Main system loop - runs every 24 hours
   */
  private async runMainLoop(): Promise<void> {
    while (this.state.isRunning) {
      try {
        console.log("\n" + "=".repeat(60));
        console.log("🔄 Starting Market Analysis & Conditional Rebalancing Cycle");
        console.log("=".repeat(60));

        await this.performFullAnalysis();
        
        // Check if portfolio rebalancing is needed
        const shouldRebalance = this.shouldUpdatePortfolio();
        if (shouldRebalance) {
          await this.performPortfolioRebalancing();
        } else {
          console.log("📊 Portfolio rebalancing not needed - conditions don't warrant changes");
        }

        this.state.lastUpdate = Date.now();

        // Determine next cycle timing based on whether we rebalanced
        const nextAnalysisInterval = this.tradingConfig.portfolioUpdateIntervalMs / 4; // Analyze 4x more frequently than rebalancing
        const waitTime = shouldRebalance ? this.tradingConfig.portfolioUpdateIntervalMs : nextAnalysisInterval;
        
        console.log(`✅ Analysis cycle completed. Next analysis in ${Math.round(waitTime / (60 * 60 * 1000))}h...\n`);
        await this.sleep(waitTime);

      } catch (error) {
        console.error("❌ Error in main loop:", error);
        await this.sleep(5 * 60 * 1000); // Wait 5 minutes before retrying
      }
    }
  }


  /**
   * Perform initial data collection
   */
  private async performInitialDataCollection(): Promise<void> {
    console.log("📊 Performing initial data collection...");

    // Get initial topics and fetch all data in parallel
    const initialTopics = this.topicGenerator.getTopicsForAnalysis(10);
    
    // Use the new comprehensive parallel fetch method (now includes Fear & Greed)
    const { topicScores, sentimentData, fearGreedAnalysis } = await this.newsService.fetchAllData(
      initialTopics,
      ['24h', '48h']
    );
    
    // Process the results
    this.state.currentTopics = topicScores;
    this.trendAnalyzer.addTopicScores(topicScores);
    
    // Add sentiment data to analyzer
    sentimentData.forEach((sentiment) => {
      if (sentiment) {
        this.trendAnalyzer.addSentimentData(sentiment);
      }
    });

    // Add Fear & Greed analysis
    if (fearGreedAnalysis) {
      this.trendAnalyzer.addFearGreedAnalysis(fearGreedAnalysis);
    }

    // Generate initial 10-token portfolio
    console.log("🎯 Generating initial 10-token portfolio...");
    const initialRiskProfile = this.determineRiskProfile();
    this.currentPortfolio = await this.portfolioService.generateEqualAllocationPortfolio(10, initialRiskProfile);
    this.lastPortfolioUpdate = Date.now();
    
    console.log("✅ Initial data collection completed");
  }

  /**
   * Perform full analysis cycle
   */
  private async performFullAnalysis(): Promise<void> {
    // 1. Get topics for this cycle
    const topicsToAnalyze = this.getTopicsForCurrentCycle();
    console.log(`🎯 Analyzing ${topicsToAnalyze.length} topics this cycle`);

    // 2. Fetch all data in parallel (topics + sentiment + Fear & Greed + trending tokens)
    console.log("📊 Fetching comprehensive market data in parallel...");
    const [
      { topicScores, sentimentData, fearGreedAnalysis },
      trendingTokens
    ] = await Promise.all([
      this.newsService.fetchAllData(topicsToAnalyze, ['24h']),
      this.trendingTokensService.fetchTrendingTokens()
    ]);

    // 3. Process topic scores
    this.state.currentTopics = topicScores;
    this.trendAnalyzer.addTopicScores(topicScores);

    // 4. Process sentiment data
    const sentiment24h = sentimentData.get('24h');
    if (sentiment24h) {
      this.trendAnalyzer.addSentimentData(sentiment24h);
      this.state.sentimentHistory.push(sentiment24h);
    }

    // 5. Process Fear & Greed data
    if (fearGreedAnalysis) {
      this.trendAnalyzer.addFearGreedAnalysis(fearGreedAnalysis);
      console.log(`😱 Fear & Greed: ${fearGreedAnalysis.today.value} (${fearGreedAnalysis.today.value_classification}) - ${fearGreedAnalysis.trend}`);
    }

    // 6. Analyze trending tokens
    console.log(`🪙 Processing ${trendingTokens.length} trending tokens...`);
    const tokenAnalysis = await this.trendingTokensService.getMarketAnalysis();
    console.log(`🎯 Token Market Sentiment: ${tokenAnalysis.marketSentiment.toUpperCase()}`);

    // 7. Portfolio rebalancing is now handled separately in performPortfolioRebalancing()

    // 8. Extract new topics from headlines using AI agent
    const allHeadlines = topicScores.flatMap(ts => ts.articles.map(a => a.title));
    if (allHeadlines.length > 0) {
      console.log("🤖 Using AI agent to discover new Solana topics...");
      try {
        const newTopics = await this.topicGenerator.extractTopicsFromHeadlines(allHeadlines);
        this.topicGenerator.addDynamicTopics(newTopics);
      } catch (error) {
        console.error("❌ Error in AI topic extraction:", error);
      }
    }

    // 9. Analyze trends
    this.state.trendAnalysis = this.trendAnalyzer.analyzeTrends();

    // 10. Clean up old data
    this.topicGenerator.cleanupDynamicTopics();

    // 11. Print analysis summary with token data and portfolio
    this.printAnalysisSummary(tokenAnalysis);
  }

  /**
   * Get topics for current analysis cycle
   */
  private getTopicsForCurrentCycle(): string[] {
    // Always include high-priority topics
    const highPriority = this.topicGenerator.getHighPriorityTopics();
    
    // Add some random topics for discovery
    const randomTopics = this.topicGenerator.getTopicsForAnalysis(this.maxTopicsPerCycle - highPriority.length);
    
    // Combine and deduplicate
    const allTopics = [...new Set([...highPriority, ...randomTopics])];
    
    return allTopics.slice(0, this.maxTopicsPerCycle);
  }

  /**
   * Check if portfolio should be updated
   */
  private shouldUpdatePortfolio(): boolean {
    console.log("\n🔍 PORTFOLIO UPDATE EVALUATION:");
    console.log("-".repeat(50));
    
    const timeSinceLastUpdate = Date.now() - this.lastPortfolioUpdate;
    const hoursElapsed = Math.round(timeSinceLastUpdate / (60 * 60 * 1000));
    const requiredHours = Math.round(this.tradingConfig.portfolioUpdateIntervalMs / (60 * 60 * 1000));
    
    console.log(`⏰ Time since last update: ${hoursElapsed}h (Required: ${requiredHours}h)`);
    
    // Update portfolio if:
    // 1. No portfolio exists yet
    // 2. Portfolio update interval has passed
    // 3. Significant market changes detected
    if (!this.currentPortfolio) {
      console.log("📝 ✅ TRIGGER: No portfolio exists - generating initial portfolio");
      return true;
    }
    
    if (timeSinceLastUpdate > this.tradingConfig.portfolioUpdateIntervalMs) {
      console.log("⏰ ✅ TRIGGER: Portfolio update interval reached - refreshing portfolio");
      return true;
    }
    
    // Check for significant market changes
    const stats = this.trendAnalyzer.getSummaryStats();
    const fearGreedTrend = this.trendAnalyzer.getFearGreedTrend();
    const fearGreedChange = fearGreedTrend.current?.change ?? 0;
    
    console.log(`📊 Market condition: ${stats.marketCondition.toUpperCase()}`);
    console.log(`😱 Fear & Greed change: ${fearGreedChange > 0 ? '+' : ''}${fearGreedChange}`);
    
    // Trigger update on major market sentiment changes
    if (stats.marketCondition === 'bearish') {
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

  /**
   * Generate a new portfolio based on current market conditions
   */
  private async generatePortfolio(): Promise<void> {
    try {
      console.log("\n" + "🎯".repeat(20));
      console.log("🎯 GENERATING AI-POWERED PORTFOLIO");
      console.log("🎯".repeat(20));

      // Determine risk profile based on market conditions
      const riskProfile = this.determineRiskProfile();
      console.log(`📊 Risk Profile: ${riskProfile.toUpperCase()}`);

      // Generate portfolio with 5 tokens for equal allocation
      const portfolioAnalysis = await this.portfolioService.generateEqualAllocationPortfolio(5, riskProfile);
      
      this.currentPortfolio = portfolioAnalysis;
      this.lastPortfolioUpdate = Date.now();

      console.log("✅ Portfolio generated successfully!");
      this.printPortfolioSummary(portfolioAnalysis);

    } catch (error) {
      console.error("❌ Error generating portfolio:", error);
    }
  }

  /**
   * Update trading configuration based on risk profile
   */
  private updateTradingConfig(riskProfile: 'conservative' | 'moderate' | 'aggressive'): void {
    this.tradingConfig = getTradingConfigByRiskProfile(riskProfile);
    console.log(`📊 Trading config updated for ${riskProfile} profile (Portfolio updates every ${Math.round(this.tradingConfig.portfolioUpdateIntervalMs / (60 * 60 * 1000))}h)`);
  }

  /**
   * Determine risk profile based on current market conditions
   */
  private determineRiskProfile(): 'conservative' | 'moderate' | 'aggressive' {
    const stats = this.trendAnalyzer.getSummaryStats();
    const fearGreedTrend = this.trendAnalyzer.getFearGreedTrend();
    const sentimentTrend = this.trendAnalyzer.getSentimentTrend();

    let riskScore = 0; // Start neutral

    // Fear & Greed influence
    if (fearGreedTrend.current) {
      const fearGreedValue = parseInt(fearGreedTrend.current.today.value);
      if (fearGreedValue < 25) {
        riskScore += 2; // Extreme fear = opportunity for aggressive
      } else if (fearGreedValue > 75) {
        riskScore -= 2; // Extreme greed = be conservative
      }
    }

    // Market sentiment influence
    const positiveSentiment = sentimentTrend.current?.percentages.positive || 50;
    if (positiveSentiment > 65) {
      riskScore += 1; // Positive sentiment = slightly more aggressive
    } else if (positiveSentiment < 35) {
      riskScore -= 1; // Negative sentiment = more conservative
    }

    // Market condition influence
    if (stats.marketCondition === 'bullish') {
      riskScore += 1;
    } else if (stats.marketCondition === 'bearish') {
      riskScore -= 2;
    } else if (stats.marketCondition === 'neutral') {
      // Neutral market - slight preference for moderate risk
      riskScore += 0;
    }

    // Trending topics influence
    if (stats.risingTopics > stats.fallingTopics * 1.5) {
      riskScore += 1; // Strong momentum = more aggressive
    }

    // Determine final risk profile
    if (riskScore >= 2) {
      return 'aggressive';
    } else if (riskScore <= -2) {
      return 'conservative';
    } else {
      return 'moderate';
    }
  }

  /**
   * Print portfolio summary
   */
  private printPortfolioSummary(portfolioAnalysis: PortfolioAnalysis): void {
    const { portfolio, analysis } = portfolioAnalysis;
    
    console.log("\n💼 PORTFOLIO SUMMARY");
    console.log("=".repeat(50));
    
    console.log(`📝 ${portfolio.name}`);
    console.log(`🎯 Strategy: ${portfolio.metadata.strategy.replace('_', ' ').toUpperCase()}`);
    console.log(`⚠️ Risk Profile: ${portfolio.metadata.riskProfile.toUpperCase()}`);
    console.log(`📊 Market Alignment: ${analysis.marketAlignmentScore}/100`);
    console.log(`🎯 Recommended Action: ${analysis.recommendedAction.toUpperCase()}`);
    
    console.log("\n🪙 SELECTED TOKENS:");
    portfolio.tokens.forEach((token, index) => {
      console.log(`${index + 1}. ${token.symbol} (${token.name})`);
      console.log(`   💰 Allocation: ${token.allocation.toFixed(1)}%`);
      console.log(`   📈 Confidence: ${token.confidence}%`);
      console.log(`   ⚠️ Risk Score: ${token.riskScore}/10`);
      console.log(`   🚀 Momentum: ${token.momentumScore}/100`);
      console.log(`   😊 Sentiment: ${token.sentimentScore}/100`);
      console.log(`   💭 Reason: ${token.reasoning}`);
      console.log("");
    });

    console.log("📊 PORTFOLIO ANALYSIS:");
    console.log(`   📈 Avg Momentum Score: ${analysis.averageMomentumScore}/100`);
    console.log(`   😊 Avg Sentiment Score: ${analysis.averageSentimentScore}/100`);
    console.log(`   ⚠️ Avg Risk Score: ${analysis.averageRiskScore}/10`);
    console.log(`   🎯 Diversification: ${analysis.diversificationScore}/100`);

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

  /**
   * Get current portfolio analysis (public API)
   */
  public getCurrentPortfolio(): PortfolioAnalysis | null {
    return this.currentPortfolio;
  }

  /**
   * Get last portfolio update timestamp (public API)
   */
  public getLastPortfolioUpdate(): number {
    return this.lastPortfolioUpdate;
  }

  /**
   * Generate portfolio now with specified parameters (public API)
   */
  public async generatePortfolioNow(riskProfile: 'conservative' | 'moderate' | 'aggressive', tokenCount: number = 10): Promise<PortfolioAnalysis> {
    console.log(`\n🎯 Manually generating portfolio (Risk: ${riskProfile}, Tokens: ${tokenCount})`);
    
    const portfolioAnalysis = await this.portfolioService.generateEqualAllocationPortfolio(tokenCount, riskProfile);
    
    this.currentPortfolio = portfolioAnalysis;
    this.lastPortfolioUpdate = Date.now();

    console.log("✅ Manual portfolio generation completed!");
    this.printPortfolioSummary(portfolioAnalysis);

    return portfolioAnalysis;
  }

  /**
   * Trigger automatic portfolio rebalancing immediately (public API)
   */
  public async triggerRebalancingNow(): Promise<void> {
    console.log('\n🎯 Triggering immediate portfolio rebalancing...');
    await this.performPortfolioRebalancing();
  }

  /**
   * Make agent trading decision based on analysis
   */
  private async makeAgentDecision(): Promise<void> {
    try {
      console.log("\n🤖 Making Agent Decision...");

      const analysisData = await this.prepareAnalysisForAgent();
      const decision = await this.generateAgentDecision(analysisData);
      
      if (decision) {
        this.state.lastDecision = decision;
        console.log("💡 Agent Decision:", decision);

        // Execute decision if confidence is high enough
        if (decision.confidence >= 70 && decision.action !== 'hold') {
          await this.executeDecision(decision);
        } else {
          console.log("⏸️ Decision confidence too low or action is hold - not executing");
        }
      }

    } catch (error) {
      console.error("❌ Error making agent decision:", error);
    }
  }

  /**
   * Prepare analysis data for the agent
   */
  private async prepareAnalysisForAgent(): Promise<string> {
    const topTrending = this.trendAnalyzer.getTopTrendingTopics(5);
    const topMomentum = this.trendAnalyzer.getTopicsByMomentum().slice(0, 5);
    const sentimentTrend = this.trendAnalyzer.getSentimentTrend();
    const fearGreedTrend = this.trendAnalyzer.getFearGreedTrend();
    const stats = this.trendAnalyzer.getSummaryStats();

    // Get trending token data
    const tokenAnalysis = await this.trendingTokensService.getMarketAnalysis();
    const topMomentumTokens = await this.trendingTokensService.getTopMomentumTokens(5, '1h');
    const lowRiskTokens = await this.trendingTokensService.getLowRiskTrendingTokens(3);
    const highLiquidityTokens = await this.trendingTokensService.getHighLiquidityTokens(3);

    return `
COMPREHENSIVE MARKET ANALYSIS REPORT
===================================

📈 TOP TRENDING TOPICS (Rising):
${topTrending.map(t => `- ${t.topic}: ${t.trendStrength.toFixed(1)}% change (Score: ${t.currentScore})`).join('\n')}

🚀 TOP MOMENTUM TOPICS:
${topMomentum.map(m => `- ${m.topic}: Momentum ${m.momentum.toFixed(1)} (${m.trend?.trend || 'stable'})`).join('\n')}

😊 MARKET SENTIMENT:
- Current: ${sentimentTrend.current?.percentages.positive.toFixed(1)}% positive, ${sentimentTrend.current?.percentages.negative.toFixed(1)}% negative
- Trend: ${sentimentTrend.trend} (${sentimentTrend.change > 0 ? '+' : ''}${sentimentTrend.change.toFixed(1)}%)

😱 FEAR & GREED INDEX:
- Current: ${fearGreedTrend.current?.today.value || 'N/A'} (${fearGreedTrend.current?.today.value_classification || 'N/A'})
- Trend: ${fearGreedTrend.trend} (${(fearGreedTrend.current?.change ?? 0) > 0 ? '+' : ''}${fearGreedTrend.current?.change ?? 0} from yesterday)
- Average: ${fearGreedTrend.averageValue} | Volatility: ${fearGreedTrend.volatility}

🪙 TRENDING TOKENS ANALYSIS:
- Market Sentiment: ${tokenAnalysis.marketSentiment.toUpperCase()}
- Total Tokens Tracked: ${tokenAnalysis.totalTokens}
- Average Risk Score: ${tokenAnalysis.averageRiskScore.toFixed(1)}/10
- Risk Distribution: ${tokenAnalysis.riskDistribution.low} low, ${tokenAnalysis.riskDistribution.medium} medium, ${tokenAnalysis.riskDistribution.high} high risk

🚀 TOP MOMENTUM TOKENS (1h):
${topMomentumTokens.map(t => {
  const change = t.events['1h']?.priceChangePercentage || 0;
  const analysis = this.trendingTokensService.analyzeTokenOpportunity(t);
  return `- ${t.token.symbol} (${t.token.name}): +${change.toFixed(1)}% | Score: ${analysis.score}/100 | ${analysis.recommendation.toUpperCase()}`;
}).join('\n')}

🛡️ LOW RISK TRENDING TOKENS:
${lowRiskTokens.map(t => {
  const change = t.events['1h']?.priceChangePercentage || 0;
  const liquidity = t.pools[0]?.liquidity.usd || 0;
  return `- ${t.token.symbol}: +${change.toFixed(1)}% | Risk: ${t.risk.score}/10 | Liquidity: $${(liquidity/1000).toFixed(0)}K`;
}).join('\n')}

💧 HIGH LIQUIDITY TOKENS:
${highLiquidityTokens.map(t => {
  const liquidity = t.pools[0]?.liquidity.usd || 0;
  const change = t.events['1h']?.priceChangePercentage || 0;
  return `- ${t.token.symbol}: $${(liquidity/1000000).toFixed(1)}M liquidity | ${change.toFixed(1)}% (1h)`;
}).join('\n')}

📊 MARKET OVERVIEW:
- Overall Condition: ${stats.marketCondition.toUpperCase()} 🎯
- Topics Tracked: ${stats.totalTopicsTracked}
- Rising: ${stats.risingTopics}, Falling: ${stats.fallingTopics}, Stable: ${stats.stableTopics}
- Average Popularity: ${stats.avgPopularityScore.toFixed(1)}
- Sentiment Trend: ${stats.sentimentTrend}
- Fear & Greed Trend: ${stats.fearGreedTrend}

🎯 CURRENT TOP TOPICS BY POPULARITY:
${this.state.currentTopics.slice(0, 10).map(t => `- ${t.topic}: ${t.popularityScore} articles`).join('\n')}

💡 TRADING SIGNALS:
${this.generateTradingSignals(fearGreedTrend, sentimentTrend, stats, tokenAnalysis)}
`;
  }

  /**
   * Generate trading signals based on multiple indicators
   */
  private generateTradingSignals(fearGreedTrend: any, sentimentTrend: any, stats: any, tokenAnalysis: any): string {
    const signals: string[] = [];
    
    // Fear & Greed signals
    if (fearGreedTrend.current) {
      const value = parseInt(fearGreedTrend.current.today.value);
      if (value <= 25) {
        signals.push("🔴 EXTREME FEAR detected - Potential buying opportunity (contrarian signal)");
      } else if (value >= 75) {
        signals.push("🔴 EXTREME GREED detected - Consider taking profits/reducing positions");
      } else if (fearGreedTrend.trend === 'improving' && value > 45) {
        signals.push("🟢 Fear & Greed improving - Positive momentum building");
      } else if (fearGreedTrend.trend === 'declining' && value < 55) {
        signals.push("🟡 Fear & Greed declining - Caution advised");
      }
    }

    // Sentiment signals
    const positiveSentiment = sentimentTrend.current?.percentages.positive || 50;
    if (positiveSentiment > 65 && sentimentTrend.trend === 'improving') {
      signals.push("🟢 Strong positive sentiment with improving trend");
    } else if (positiveSentiment < 35 && sentimentTrend.trend === 'declining') {
      signals.push("🔴 Weak sentiment declining - High risk environment");
    }

    // Market condition signals
    if (stats.marketCondition === 'bullish') {
      signals.push("🟢 BULLISH market conditions detected - Consider long positions");
    } else if (stats.marketCondition === 'bearish') {
      signals.push("🔴 BEARISH market conditions detected - Consider defensive positioning");
    }

    // Topic momentum signals
    if (stats.risingTopics > stats.fallingTopics * 1.5) {
      signals.push("🟢 Strong topic momentum - Multiple trending assets");
    } else if (stats.fallingTopics > stats.risingTopics * 1.5) {
      signals.push("🔴 Weak topic momentum - Market losing interest");
    }

    // Token analysis signals
    if (tokenAnalysis.marketSentiment === 'bullish') {
      signals.push("🟢 Positive token market sentiment - Consider buying");
    } else if (tokenAnalysis.marketSentiment === 'bearish') {
      signals.push("🔴 Negative token market sentiment - Consider selling");
    }

    return signals.length > 0 ? signals.join('\n') : "🟡 No clear trading signals - Market in neutral state";
  }

  /**
   * Generate agent decision using AI
   */
  private async generateAgentDecision(analysisData: string): Promise<AgentDecision | null> {
    try {
      const prompt = `You are a sophisticated crypto trading agent analyzing market trends and sentiment data.

${analysisData}

Based on this comprehensive analysis, make a trading decision. Consider:
1. Strong trending topics that might have associated tokens
2. Overall market sentiment and its trend
3. Risk management (never risk more than 10% of portfolio)
4. Focus on Solana ecosystem tokens when possible

IMPORTANT: Always use token CONTRACT ADDRESSES (mint addresses) instead of symbols when making trading decisions. Symbols can be duplicated or fake, but contract addresses are unique.

CONTRACT ADDRESS REQUIREMENTS:
- Must be valid base58-encoded Solana public keys (44 characters)
- Example valid address: DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263
- NO made-up addresses, NO symbols, NO invalid characters
- If you don't have a valid contract address, choose "hold"

Respond with a JSON object containing:
- action: "buy", "sell", or "hold"
- token: VALID token CONTRACT ADDRESS (mint address) if buying/selling (or null for hold) - NOT the symbol
- amount: INTEGER percentage of SOL balance to use (1-10 for buy, or percentage to sell) - NO DECIMALS
- confidence: confidence level 0-100
- reasoning: detailed explanation of your decision including the token symbol and contract address

Be conservative and only make high-confidence trades. If market conditions are unclear, choose "hold".
If you don't have access to specific valid contract addresses, choose "hold" rather than guessing.
CRITICAL: Contract addresses will be validated - invalid addresses will cause trade cancellation.`;

      const result = await generateText({
        model: openai("gpt-4o-mini"),
        prompt,
        maxTokens: 500,
      });

      // Try to parse JSON from the response
      const jsonMatch = result.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const decisionData = JSON.parse(jsonMatch[0]);
        return {
          action: decisionData.action,
          token: decisionData.token,
          amount: decisionData.amount,
          confidence: decisionData.confidence,
          reasoning: decisionData.reasoning,
          timestamp: Date.now()
        };
      }

      console.log("⚠️ Could not parse decision from AI response:", result.text);
      return null;

    } catch (error) {
      console.error("❌ Error generating agent decision:", error);
      return null;
    }
  }

  /**
   * Execute a trading decision
   */
  private async executeDecision(decision: AgentDecision): Promise<void> {
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

      // Validate mint address before proceeding
      if (decision.token && !this.isValidSolanaAddress(decision.token)) {
        console.log(`❌ INVALID MINT ADDRESS: ${decision.token}`);
        console.log(`💡 Mint addresses must be valid base58-encoded Solana public keys`);
        console.log(`🔍 Example valid address: DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263`);
        console.log(`⏸️ Trade cancelled due to invalid address\n`);
        return;
      }

      // Create trading prompt for the AI agent
      const tradingPrompt = `Based on my analysis, I want to ${decision.action} tokens with the EXACT contract address below.

Analysis Summary: ${decision.reasoning}

MANDATORY CONTRACT ADDRESS: ${decision.token}
TOKEN ACTION: ${decision.action.toUpperCase()}
PERCENTAGE: ${safeAmount}%

CRITICAL REQUIREMENTS: 
- Use EXACTLY this contract address for ALL operations: ${decision.token}
- NEVER use symbols, NEVER modify this address, NEVER truncate it
- ALWAYS use INTEGER amounts in lamports/token units - NEVER decimal numbers like 82719484.75
- ROUND DOWN all calculations to integers using Math.floor()
- Jupiter API amount parameter MUST be an integer (no decimals allowed)
- For ANY token balance checks, use EXACTLY: ${decision.token}
- For ANY trading operations, use EXACTLY: ${decision.token}

STEP-BY-STEP INSTRUCTIONS:
1. Check my current SOL balance in lamports
2. ${decision.action === 'buy' ? 
    `Calculate exactly ${safeAmount}% of my SOL balance: (balance_in_lamports * ${safeAmount} / 100) and use that INTEGER amount to buy tokens with contract address ${decision.token}` :
    `Check my balance of tokens with contract address ${decision.token}, then sell exactly ${safeAmount}% of that balance`}
3. Verify the calculated amount is reasonable and within my balance
4. Execute the ${decision.action} using contract address: ${decision.token}
5. Provide a summary of the transaction

CRITICAL: If you need to check token balance, use EXACTLY this address: ${decision.token}
CRITICAL: If you need to trade tokens, use EXACTLY this address: ${decision.token}
CRITICAL: NEVER use any other address, symbol, or modified version of this address.`;

      // Safety check: Verify we have enough balance for the intended trade
      const currentBalance = await this.getWalletBalance();
      const currentBalanceLamports = Math.floor(currentBalance * 1e9);
      const maxTradeAmountLamports = Math.floor(currentBalanceLamports * safeAmount / 100);
      
      console.log(`\n🛡️ SAFETY CHECK:`);
      console.log(`   💰 Current balance: ${currentBalance.toFixed(4)} SOL (${currentBalanceLamports} lamports)`);
      console.log(`   📊 Max trade amount: ${safeAmount}% = ${(maxTradeAmountLamports / 1e9).toFixed(4)} SOL (${maxTradeAmountLamports} lamports)`);
      
      if (maxTradeAmountLamports > currentBalanceLamports * 0.99) { // Leave 1% for fees
        console.log(`   ❌ TRADE REJECTED: Not enough balance for ${safeAmount}% trade`);
        console.log(`   💡 Suggestion: Reduce percentage or wait for more SOL`);
        return;
      }
      
      console.log(`   ✅ Trade amount safe - proceeding with execution\n`);

      console.log("🔍 DEBUG INFO:");
      console.log(`   🎯 Action: ${decision.action}`);
      console.log(`   📍 Contract Address: "${decision.token}"`);
      console.log(`   📏 Address Length: ${decision.token?.length || 0} characters`);
      console.log(`   ✅ Address Validation: ${this.isValidSolanaAddress(decision.token || '')}`);
      console.log(`   📊 Amount: ${safeAmount}%`);
      console.log("");

      console.log("🤖 Executing trade with AI agent...");
      console.log("⏰ Timeout set to 60 seconds...");

      // Add timeout wrapper
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('AI agent timeout after 60 seconds')), 60000);
      });

      const generateTextPromise = generateText({
        model: openai("gpt-4o-mini"),
        tools: this.tools,
        maxSteps: 5, // Reduced from 10 to avoid hanging
        prompt: `You are a crypto trading assistant. Execute this trade quickly and efficiently.

CONTRACT ADDRESS: ${decision.token}
ACTION: ${decision.action.toUpperCase()}
AMOUNT: ${safeAmount}% of SOL balance

CRITICAL: ALL amounts must be INTEGERS - never use decimals like 82719484.75

INSTRUCTIONS:
1. Check SOL balance in lamports (integer)
2. ${decision.action === 'buy' ? 
    `Calculate ${safeAmount}% of SOL balance: Math.floor(balance_lamports * ${safeAmount} / 100) and buy tokens with address ${decision.token}` :
    `Sell ${safeAmount}% of tokens with address ${decision.token}`}
3. Execute trade with INTEGER amount only
4. Report result

Keep it simple and fast. Use the exact contract address: ${decision.token}
NEVER use decimal amounts - Jupiter API requires integers only.`,
        onStepFinish: (event) => {
          console.log(`🔧 AI Agent Step:`);
          if (event.toolCalls && event.toolCalls.length > 0) {
            event.toolCalls.forEach(call => {
              console.log(`   📞 ${call.toolName}(${JSON.stringify(call.args)})`);
            });
          }
          if (event.toolResults && event.toolResults.length > 0) {
            event.toolResults.forEach(result => {
              console.log(`   ✅ Result: ${result.result ? 'Success' : 'Failed'}`);
            });
          }
          console.log("-".repeat(30));
        },
      });

      const result = await Promise.race([generateTextPromise, timeoutPromise]) as any;

      console.log("\n💼 Trade Execution Result:");
      console.log(result.text);

    } catch (error) {
      console.error("❌ Error executing decision:", error);
    }
  }

  /**
   * Print analysis summary
   */
  private printAnalysisSummary(tokenAnalysis: any): void {
    console.log("\n📊 COMPREHENSIVE ANALYSIS SUMMARY");
    console.log("=".repeat(50));

    const stats = this.trendAnalyzer.getSummaryStats();
    const fearGreedTrend = this.trendAnalyzer.getFearGreedTrend();
    
    console.log(`🎯 Market Condition: ${stats.marketCondition.toUpperCase()}`);
    console.log(`📈 Topics: ${stats.totalTopicsTracked} tracked | 🔥 ${stats.risingTopics} rising | 📉 ${stats.fallingTopics} falling`);
    console.log(`😊 Sentiment: ${stats.sentimentTrend}`);
    console.log(`😱 Fear & Greed: ${stats.fearGreedStatus} (${stats.fearGreedTrend})`);

    const topTrending = this.trendAnalyzer.getTopTrendingTopics(3);
    if (topTrending.length > 0) {
      console.log("\n🚀 TOP TRENDING:");
      topTrending.forEach(t => {
        console.log(`  ${t.topic}: +${t.trendStrength.toFixed(1)}% (${t.currentScore} articles)`);
      });
    }

    const topPopular = this.state.currentTopics.slice(0, 5);
    console.log("\n📰 MOST POPULAR:");
    topPopular.forEach(t => {
      console.log(`  ${t.topic}: ${t.popularityScore} articles`);
    });

    // Fear & Greed details
    if (fearGreedTrend.current) {
      const currentFG = fearGreedTrend.current;
      console.log(`\n😱 FEAR & GREED DETAILS:`);
      console.log(`  Today: ${currentFG.today.value} (${currentFG.today.value_classification})`);
      console.log(`  Yesterday: ${currentFG.yesterday.value} (${currentFG.yesterday.value_classification})`);
      const change = currentFG.change ?? 0;
      console.log(`  Change: ${change > 0 ? '+' : ''}${change}`);
      console.log(`  Trend: ${fearGreedTrend.trend} | Average: ${fearGreedTrend.averageValue} | Volatility: ${fearGreedTrend.volatility}`);
    }

    // Token analysis
    console.log("\n🪙 TOKEN ANALYSIS:");
    console.log(`🎯 Market Sentiment: ${tokenAnalysis.marketSentiment.toUpperCase()}`);
    console.log(`📊 Total Tokens: ${tokenAnalysis.totalTokens}`);
    console.log(`⚠️ Average Risk: ${tokenAnalysis.averageRiskScore.toFixed(1)}/10`);
    console.log(`🔴 High Risk: ${tokenAnalysis.riskDistribution.high} | 🟡 Medium: ${tokenAnalysis.riskDistribution.medium} | 🟢 Low: ${tokenAnalysis.riskDistribution.low}`);
    
    if (tokenAnalysis.topPerformers.length > 0) {
      console.log("\n🚀 TOP PERFORMING TOKENS (1h):");
      tokenAnalysis.topPerformers.slice(0, 3).forEach((token: any) => {
        const change = token.events['1h']?.priceChangePercentage || 0;
        console.log(`  ${token.token.symbol}: +${change.toFixed(1)}%`);
      });
    }

    console.log("=".repeat(50));
  }

  /**
   * Get current system state
   */
  getState(): AgentState {
    return { ...this.state };
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Validate Solana address (mint address)
   */
  private isValidSolanaAddress(address: string): boolean {
    try {
      const publicKey = new PublicKey(address);
      return publicKey.toBytes().length === 32;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get current token balance for a specific mint address
   */
  private async getTokenBalance(mintAddress: string): Promise<number> {
    try {
      const tokenMint = new PublicKey(mintAddress);
      const balance = await getTokenBalance(this.connection, this.keypair.publicKey, tokenMint);
      return balance;
    } catch (error) {
      console.error(`❌ Error getting balance for ${mintAddress}:`, error);
      return 0;
    }
  }

  /**
   * Verify portfolio balances and retry failed purchases
   */
  private async verifyAndRetryPortfolio(targetPortfolio: PortfolioAnalysis): Promise<void> {
    try {
      console.log('\n🔍 PORTFOLIO VERIFICATION & RETRY PHASE');
      console.log('═══════════════════════════════════════════════════════════════════════════════════');
      
      const currentBalance = await this.getWalletBalance();
      console.log(`💰 Current SOL balance: ${currentBalance.toFixed(4)} SOL`);
      
      const failedPurchases: Array<{token: any, reason: string}> = [];
      const successfulPurchases: Array<{token: any, actualBalance: number}> = [];
      
      console.log('\n📊 CHECKING ACQUIRED TOKENS:');
      console.log('-'.repeat(50));
      
      // Check each target token
      for (const token of targetPortfolio.portfolio.tokens) {
        console.log(`\n🔍 Verifying ${token.symbol} (${token.name})`);
        console.log(`   📍 Contract: ${token.mint}`);
        console.log(`   🎯 Target allocation: ${token.allocation}%`);
        
        if (!this.isValidSolanaAddress(token.mint)) {
          failedPurchases.push({token, reason: 'Invalid contract address'});
          console.log(`   ❌ Invalid contract address - cannot verify`);
          continue;
        }

        try {
          // Check if we actually have this token using direct balance query
          console.log(`   🔧 Checking actual token balance...`);
          const tokenBalance = await this.getTokenBalance(token.mint);
          
          if (tokenBalance === 0) {
            failedPurchases.push({token, reason: 'Purchase failed - zero balance'});
            console.log(`   ❌ Purchase failed - no tokens acquired (balance: 0)`);
          } else {
            successfulPurchases.push({token, actualBalance: tokenBalance});
            console.log(`   ✅ Purchase successful - tokens acquired (balance: ${tokenBalance})`);
          }
          
        } catch (error) {
          failedPurchases.push({token, reason: `Verification error: ${error}`});
          console.log(`   ❌ Error verifying balance: ${error}`);
        }

        // Small delay between checks
        await this.sleep(1000);
      }

      // Report verification results
      console.log('\n📋 VERIFICATION SUMMARY:');
      console.log('═══════════════════════════════════════════════════════════════════════════════════');
      console.log(`✅ Successful purchases: ${successfulPurchases.length}/${targetPortfolio.portfolio.tokens.length}`);
      console.log(`❌ Failed purchases: ${failedPurchases.length}/${targetPortfolio.portfolio.tokens.length}`);
      
      if (successfulPurchases.length > 0) {
        console.log('\n✅ SUCCESSFULLY ACQUIRED:');
        successfulPurchases.forEach(({token}) => {
          console.log(`   • ${token.symbol} (${token.allocation}% target)`);
        });
      }

      if (failedPurchases.length > 0) {
        console.log('\n❌ FAILED TO ACQUIRE:');
        failedPurchases.forEach(({token, reason}) => {
          console.log(`   • ${token.symbol} (${token.allocation}% target) - ${reason}`);
        });

        // Retry failed purchases
        console.log('\n🔄 RETRYING FAILED PURCHASES:');
        console.log('-'.repeat(50));
        
        const updatedBalance = await this.getWalletBalance();
        const availableForRetry = updatedBalance * 0.99; // Leave 1% for fees
        
        console.log(`💰 Available for retry: ${availableForRetry.toFixed(4)} SOL`);
        
        if (availableForRetry > 0.001) { // Only retry if we have reasonable amount
          for (const {token, reason} of failedPurchases) {
            if (reason.includes('Invalid contract address')) {
              console.log(`\n⏸️  Skipping ${token.symbol} - invalid address cannot be retried`);
              continue;
            }

            console.log(`\n🔄 Retrying ${token.symbol} purchase...`);
            console.log(`   📍 Contract: ${token.mint}`);
            console.log(`   🎯 Target: ${token.allocation}%`);
            
            // Calculate retry amount (more conservative)
            const retryPercentage = Math.floor(Math.min(token.allocation, 5)); // Cap at 5% for retries, ensure integer
            const retryAmount = Math.floor((availableForRetry * retryPercentage / 100) * 1e9); // Convert to lamports
            
            if (retryAmount < 1000000) { // Less than 0.001 SOL
              console.log(`   ⏸️  Retry amount too small: ${(retryAmount / 1e9).toFixed(6)} SOL`);
              continue;
            }

            console.log(`   💰 Retry amount: ${retryPercentage}% = ${(retryAmount / 1e9).toFixed(4)} SOL`);

            const retryDecision: AgentDecision = {
              action: 'buy',
              token: token.mint,
              amount: Math.floor(retryPercentage), // Ensure integer amount
              confidence: 90,
              reasoning: `Portfolio verification retry: Failed to acquire ${token.symbol} in initial purchase. Retrying with ${Math.floor(retryPercentage)}% allocation.`,
              timestamp: Date.now()
            };

            try {
              await this.executeDecision(retryDecision);
              console.log(`   ✅ Retry completed for ${token.symbol}`);
            } catch (error) {
              console.log(`   ❌ Retry failed for ${token.symbol}: ${error}`);
            }

            // Delay between retries
            await this.sleep(3000);
          }
        } else {
          console.log(`⚠️  Insufficient SOL for retries (${availableForRetry.toFixed(4)} SOL available)`);
        }
      }

      // Final portfolio verification
      console.log('\n🎯 FINAL PORTFOLIO VERIFICATION:');
      console.log('═══════════════════════════════════════════════════════════════════════════════════');
      
      const finalBalance = await this.getWalletBalance();
      console.log(`💰 Final SOL balance: ${finalBalance.toFixed(4)} SOL`);
      
      let finalSuccessCount = 0;
      for (const token of targetPortfolio.portfolio.tokens) {
        try {
          const finalBalance = await this.getTokenBalance(token.mint);
          if (finalBalance > 0) {
            finalSuccessCount++;
            console.log(`✅ ${token.symbol}: Acquired (balance: ${finalBalance})`);
          } else {
            console.log(`❌ ${token.symbol}: Not acquired (balance: 0)`);
          }
        } catch (error) {
          console.log(`⚠️  ${token.symbol}: Verification error - ${error}`);
        }
      }

      const finalSuccessRate = (finalSuccessCount / targetPortfolio.portfolio.tokens.length) * 100;
      console.log(`\n📊 FINAL SUCCESS RATE: ${finalSuccessCount}/${targetPortfolio.portfolio.tokens.length} tokens (${finalSuccessRate.toFixed(1)}%)`);
      
      if (finalSuccessRate >= 80) {
        console.log('🎉 Portfolio rebalancing successful! 80%+ target allocation achieved.');
      } else if (finalSuccessRate >= 60) {
        console.log('⚠️  Portfolio rebalancing partially successful. 60%+ allocation achieved.');
      } else {
        console.log('❌ Portfolio rebalancing needs attention. Less than 60% allocation achieved.');
      }

      console.log('═══════════════════════════════════════════════════════════════════════════════════');
      
    } catch (error) {
      console.error('❌ Error in portfolio verification:', error);
    }
  }

  // ===============================================
  // SIMPLE PORTFOLIO REBALANCING
  // ===============================================

  /**
   * Get current wallet SOL balance
   */
  async getWalletBalance(): Promise<number> {
    const balance = await this.connection.getBalance(this.keypair.publicKey);
    return balance / 1e9; // Convert lamports to SOL
  }

  /**
   * Simple portfolio rebalancing - uses wallet balance minus 1% for transaction costs
   */
  async rebalancePortfolio(portfolio: PortfolioAnalysis): Promise<void> {
    console.log('\n💰 SIMPLE PORTFOLIO REBALANCING');
    console.log('═══════════════════════════════════════════════════════════════════════════════════');
    
    // Get current SOL balance
    const totalBalance = await this.getWalletBalance();
    console.log(`💵 Current wallet balance: ${totalBalance.toFixed(4)} SOL`);
    
    // Reserve 1% for transaction costs
    const reservedForTxCosts = totalBalance * 0.01;
    const availableForTrading = totalBalance - reservedForTxCosts;
    
    console.log(`🔒 Reserved for transaction costs: ${reservedForTxCosts.toFixed(4)} SOL (1%)`);
    console.log(`💰 Available for trading: ${availableForTrading.toFixed(4)} SOL`);
    
    if (availableForTrading <= 0) {
      console.log('⚠️  No funds available for trading after reserving transaction costs');
      return;
    }
    
    console.log(`\n🎯 Rebalancing into ${portfolio.portfolio.tokens.length} tokens:`);
    
    // Execute trades for each token in the portfolio
    for (const token of portfolio.portfolio.tokens) {
      const allocationAmount = (availableForTrading * token.allocation) / 100;
      
      const allocationAmountLamports = Math.floor(allocationAmount * 1e9); // Convert to lamports (integer)
      console.log(`\n🪙 ${token.symbol} (${token.name})`);
      console.log(`   📍 Contract: ${token.mint}`);
      console.log(`   📊 Allocation: ${Math.floor(token.allocation)}% = ${(allocationAmountLamports / 1e9).toFixed(4)} SOL (${allocationAmountLamports} lamports)`);
      console.log(`   📈 Confidence: ${token.confidence}%`);
      console.log(`   💭 Reason: ${token.reasoning}`);
      
      // Validate mint address before proceeding
      if (!this.isValidSolanaAddress(token.mint)) {
        console.log(`   ❌ Invalid mint address: ${token.mint} - skipping trade`);
        continue;
      }
      
      // Only execute if we have enough confidence
      if (token.confidence >= 70) {
        const decision: AgentDecision = {
          action: 'buy',
          token: token.mint, // Use mint address instead of symbol
          amount: Math.floor(token.allocation), // Use allocation percentage directly as integer
          confidence: token.confidence,
          reasoning: `Portfolio rebalancing: ${Math.floor(token.allocation)}% allocation for ${token.symbol} (${token.mint}). ${token.reasoning}`,
          timestamp: Date.now()
        };
        
        console.log(`   ✅ Executing trade for ${allocationAmount.toFixed(4)} SOL`);
        await this.executeDecision(decision);
      } else {
        console.log(`   ⏸️  Skipping - confidence ${token.confidence}% below 70% threshold`);
      }
    }
    
    console.log('\n✅ Initial portfolio rebalancing completed!');
    
    // Verify portfolio and retry failed purchases
    await this.verifyAndRetryPortfolio(portfolio);
    
    console.log('\n🎯 Portfolio rebalancing fully completed!');
  }

  /**
   * Generate and rebalance portfolio now
   */
  async generateAndRebalancePortfolio(riskProfile: 'conservative' | 'moderate' | 'aggressive' = 'moderate', tokenCount: number = 5): Promise<void> {
    console.log('\n🎯 GENERATING AND REBALANCING PORTFOLIO');
    console.log('═══════════════════════════════════════════════════════════════════════════════════');
    
    // Generate portfolio
    const portfolio = await this.generatePortfolioNow(riskProfile, tokenCount);
    
    // Rebalance into the new portfolio
    await this.rebalancePortfolio(portfolio);
  }

  /**
   * Perform automatic portfolio rebalancing (main loop method)
   */
  private async performPortfolioRebalancing(): Promise<void> {
    try {
      console.log('\n💰 AUTOMATIC PORTFOLIO REBALANCING');
      console.log('═══════════════════════════════════════════════════════════════════════════════════');
      
      // Store current portfolio tokens for comparison (using mint addresses)
      const currentTokens = this.currentPortfolio ? 
        this.currentPortfolio.portfolio.tokens.map(t => ({ mint: t.mint, symbol: t.symbol, name: t.name })) : [];
      
      // Determine optimal risk profile based on market conditions
      const riskProfile = this.determineRiskProfile();
      this.updateTradingConfig(riskProfile);
      console.log(`🎯 Risk Profile: ${riskProfile.toUpperCase()}`);
      
      // Generate new 10-token portfolio
      const newPortfolio = await this.portfolioService.generateEqualAllocationPortfolio(10, riskProfile);
      const newTokens = newPortfolio.portfolio.tokens.map(t => ({ mint: t.mint, symbol: t.symbol, name: t.name }));
      
      console.log(`\n🔄 Portfolio Comparison:`);
      console.log(`   Current: ${currentTokens.length} tokens: [${currentTokens.map(t => t.symbol).join(', ')}]`);
      console.log(`   New: ${newTokens.length} tokens: [${newTokens.map(t => t.symbol).join(', ')}]`);
      
      // Find tokens to sell and buy using mint addresses for comparison
      const currentMints = currentTokens.map(t => t.mint);
      const newMints = newTokens.map(t => t.mint);
      
      const tokensToSell = currentTokens.filter(token => !newMints.includes(token.mint));
      const tokensToBuy = newTokens.filter(token => !currentMints.includes(token.mint));
      const tokensToKeep = currentTokens.filter(token => newMints.includes(token.mint));
      
      console.log(`\n📊 Rebalancing Actions:`);
      console.log(`   🔴 Sell: ${tokensToSell.length} tokens: [${tokensToSell.map(t => t.symbol).join(', ')}]`);
      console.log(`   🟢 Buy: ${tokensToBuy.length} tokens: [${tokensToBuy.map(t => t.symbol).join(', ')}]`);
      console.log(`   🔄 Keep: ${tokensToKeep.length} tokens: [${tokensToKeep.map(t => t.symbol).join(', ')}]`);
      
      // Get current SOL balance
      const totalBalance = await this.getWalletBalance();
      const reservedForTxCosts = totalBalance * 0.01; // 1% reserved for transaction costs
      
      console.log(`\n💵 Wallet Status:`);
      console.log(`   Total SOL: ${totalBalance.toFixed(4)} SOL`);
      console.log(`   Reserved for TX: ${reservedForTxCosts.toFixed(4)} SOL (1%)`);
      
      // Step 1: Sell tokens that are no longer in the new portfolio
      if (tokensToSell.length > 0) {
        console.log(`\n🔴 SELLING PHASE - Removing ${tokensToSell.length} tokens from portfolio`);
        console.log('-'.repeat(50));
        
        for (const tokenInfo of tokensToSell) {
          console.log(`\n💸 Selling all ${tokenInfo.symbol} tokens...`);
          console.log(`   📍 Contract: ${tokenInfo.mint}`);
          
          // Validate mint address before creating decision
          if (!this.isValidSolanaAddress(tokenInfo.mint)) {
            console.log(`   ❌ Invalid mint address: ${tokenInfo.mint} - skipping sell`);
            continue;
          }
          
          const sellDecision: AgentDecision = {
            action: 'sell',
            token: tokenInfo.mint, // Use mint address instead of symbol
            amount: 100, // Sell 100% of holdings
            confidence: 95,
            reasoning: `Portfolio rebalancing: Removing ${tokenInfo.symbol} (${tokenInfo.mint}) from new portfolio allocation`,
            timestamp: Date.now()
          };
          
          await this.executeDecision(sellDecision);
        }
      } else {
        console.log(`\n✅ No tokens to sell - all current tokens remain in new portfolio`);
      }
      
      // Step 2: Calculate new allocation and buy/rebalance tokens
      console.log(`\n🟢 BUYING/REBALANCING PHASE - Allocating into 10 tokens`);
      console.log('-'.repeat(50));
      
      // Get updated SOL balance after selling
      const updatedBalance = await this.getWalletBalance();
      const updatedReserved = updatedBalance * 0.01;
      const availableForTrading = updatedBalance - updatedReserved;
      
      console.log(`\n💰 Updated wallet after selling:`);
      console.log(`   Total SOL: ${updatedBalance.toFixed(4)} SOL`);
      console.log(`   Reserved for TX: ${updatedReserved.toFixed(4)} SOL (1%)`);
      console.log(`   Available for trading: ${availableForTrading.toFixed(4)} SOL`);
      
      if (availableForTrading <= 0) {
        console.log('⚠️  No funds available for trading after reserving transaction costs');
        return;
      }
      
      // Buy/rebalance each token in the new portfolio
      for (const token of newPortfolio.portfolio.tokens) {
        const allocationAmount = (availableForTrading * token.allocation) / 100;
        
        const allocationAmountLamports = Math.floor(allocationAmount * 1e9); // Convert to lamports (integer)
        console.log(`\n🪙 ${token.symbol} (${token.name})`);
        console.log(`   📍 Contract: ${token.mint}`);
        console.log(`   📊 Target allocation: ${Math.floor(token.allocation)}% = ${(allocationAmountLamports / 1e9).toFixed(4)} SOL (${allocationAmountLamports} lamports)`);
        console.log(`   📈 Confidence: ${token.confidence}%`);
        console.log(`   💭 Reason: ${token.reasoning}`);
        
        // Validate mint address before proceeding
        if (!this.isValidSolanaAddress(token.mint)) {
          console.log(`   ❌ Invalid mint address: ${token.mint} - skipping buy`);
          continue;
        }
        
        // Execute trade if confidence is high enough
        if (token.confidence >= 60) { // Lower threshold for automatic rebalancing
          const buyDecision: AgentDecision = {
            action: 'buy',
            token: token.mint, // Use mint address instead of symbol
            amount: Math.floor(token.allocation), // Use allocation percentage directly as integer
            confidence: token.confidence,
            reasoning: `Portfolio rebalancing: ${Math.floor(token.allocation)}% allocation for ${token.symbol} (${token.mint}). ${token.reasoning}`,
            timestamp: Date.now()
          };
          
          console.log(`   ✅ Executing buy order for ${allocationAmount.toFixed(4)} SOL`);
          await this.executeDecision(buyDecision);
        } else {
          console.log(`   ⏸️  Skipping - confidence ${token.confidence}% below 60% threshold`);
        }
        
        // Small delay between trades to avoid overwhelming the system
        await this.sleep(2000);
      }
      
      // Update current portfolio
      this.currentPortfolio = newPortfolio;
      this.lastPortfolioUpdate = Date.now();
      
      console.log('\n✅ INITIAL PORTFOLIO REBALANCING COMPLETED!');
      console.log('═══════════════════════════════════════════════════════════════════════════════════');
      
      // Verify portfolio and retry failed purchases
      await this.verifyAndRetryPortfolio(newPortfolio);
      
      console.log('\n🎯 AUTOMATIC PORTFOLIO REBALANCING FULLY COMPLETED!');
      console.log('═══════════════════════════════════════════════════════════════════════════════════');
      
      // Print final portfolio summary
      this.printPortfolioSummary(newPortfolio);
      
    } catch (error) {
      console.error('❌ Error in automatic portfolio rebalancing:', error);
    }
  }
} 