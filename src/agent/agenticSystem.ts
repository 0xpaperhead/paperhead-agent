import { Config } from "../libs/config.js";
import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";

import { getOnChainTools } from "@goat-sdk/adapter-vercel-ai";
import { jupiter } from "@goat-sdk/plugin-jupiter";
import { orca } from "@goat-sdk/plugin-orca";
import { solana } from "@goat-sdk/wallet-solana";

import { Connection, Keypair } from "@solana/web3.js";
import base58 from "bs58";

import { NewsService } from "../services/newsService.js";
import { TopicGenerator } from "../services/topicGenerator.js";
import { TrendAnalyzer } from "../services/trendAnalyzer.js";
import { TrendingTokensService } from "../services/trendingTokensService.js";
import { PortfolioService } from "../services/portfolioService.js";
import { AgentState, AgentDecision, PortfolioAnalysis } from "../types/index.js";

export class AgenticSystem {
  private newsService: NewsService;
  private topicGenerator: TopicGenerator;
  private trendAnalyzer: TrendAnalyzer;
  private trendingTokensService: TrendingTokensService;
  private portfolioService: PortfolioService;
  private tools: any;
  private connection!: Connection;
  private keypair!: Keypair;
  
  private state: AgentState = {
    isRunning: false,
    lastUpdate: 0,
    currentTopics: [],
    sentimentHistory: [],
    trendAnalysis: [],
    lastDecision: undefined
  };

  // Portfolio state
  private currentPortfolio: PortfolioAnalysis | null = null;
  private portfolioUpdateInterval = 2 * 60 * 60 * 1000; // 2 hours for portfolio updates
  private lastPortfolioUpdate = 0;

  // Configuration
  private readonly updateInterval = 60 * 60 * 1000; // 1 hour
  private readonly quickUpdateInterval = 15 * 60 * 1000; // 15 minutes for high-priority topics
  private readonly maxTopicsPerCycle = 15; // Limit to avoid API rate limits

  constructor() {
    this.newsService = new NewsService();
    this.topicGenerator = new TopicGenerator();
    this.trendAnalyzer = new TrendAnalyzer();
    this.trendingTokensService = new TrendingTokensService();
    this.portfolioService = new PortfolioService(this.trendingTokensService, this.trendAnalyzer);
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

    // Start the quick update loop for high-priority topics
    this.runQuickUpdateLoop();
  }

  /**
   * Stop the agentic system
   */
  stop(): void {
    this.state.isRunning = false;
    console.log("🛑 Agentic System stopped");
  }

  /**
   * Main system loop - runs every hour
   */
  private async runMainLoop(): Promise<void> {
    while (this.state.isRunning) {
      try {
        console.log("\n" + "=".repeat(60));
        console.log("🔄 Starting Main Analysis Cycle");
        console.log("=".repeat(60));

        await this.performFullAnalysis();
        await this.makeAgentDecision();

        this.state.lastUpdate = Date.now();

        console.log("✅ Main cycle completed. Waiting for next cycle...\n");
        await this.sleep(this.updateInterval);

      } catch (error) {
        console.error("❌ Error in main loop:", error);
        await this.sleep(5 * 60 * 1000); // Wait 5 minutes before retrying
      }
    }
  }

  /**
   * Quick update loop - runs every 15 minutes for high-priority topics
   */
  private async runQuickUpdateLoop(): Promise<void> {
    // Wait a bit before starting to avoid conflicts
    await this.sleep(5 * 60 * 1000);

    while (this.state.isRunning) {
      try {
        console.log("\n📊 Quick Update: Checking high-priority topics...");
        
        const highPriorityTopics = this.topicGenerator.getHighPriorityTopics();
        const quickScores = await this.newsService.batchCalculateTopicScores(
          highPriorityTopics.slice(0, 5) // Limit to 5 topics for quick updates
        );

        this.trendAnalyzer.addTopicScores(quickScores);
        
        // Check for significant changes that might warrant immediate action
        const trends = this.trendAnalyzer.getTopTrendingTopics(3);
        if (trends.some(t => Math.abs(t.trendStrength) > 50)) {
          console.log("🚨 Significant trend detected! Consider immediate analysis...");
          // Could trigger an immediate full analysis here if needed
        }

        await this.sleep(this.quickUpdateInterval);

      } catch (error) {
        console.error("❌ Error in quick update loop:", error);
        await this.sleep(this.quickUpdateInterval);
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
    sentimentData.forEach((sentiment, interval) => {
      if (sentiment) {
        this.trendAnalyzer.addSentimentData(sentiment);
      }
    });

    // Add Fear & Greed analysis
    if (fearGreedAnalysis) {
      this.trendAnalyzer.addFearGreedAnalysis(fearGreedAnalysis);
    }

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

    // 7. Generate/Update Portfolio if needed
    const shouldUpdatePortfolio = this.shouldUpdatePortfolio();
    if (shouldUpdatePortfolio) {
      await this.generatePortfolio();
    }

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
    const timeSinceLastUpdate = Date.now() - this.lastPortfolioUpdate;
    
    // Update portfolio if:
    // 1. No portfolio exists yet
    // 2. Portfolio update interval has passed
    // 3. Significant market changes detected
    if (!this.currentPortfolio) {
      console.log("📝 No portfolio exists - generating initial portfolio");
      return true;
    }
    
    if (timeSinceLastUpdate > this.portfolioUpdateInterval) {
      console.log("⏰ Portfolio update interval reached - refreshing portfolio");
      return true;
    }
    
    // Check for significant market changes
    const stats = this.trendAnalyzer.getSummaryStats();
    const fearGreedTrend = this.trendAnalyzer.getFearGreedTrend();
    
    // Trigger update on major market sentiment changes
    if (stats.marketCondition === 'bearish' || 
        (fearGreedTrend.current && Math.abs(fearGreedTrend.current.change ?? 0) > 20)) {
      console.log("🚨 Significant market changes detected - updating portfolio");
      return true;
    }
    
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
  public async generatePortfolioNow(riskProfile: 'conservative' | 'moderate' | 'aggressive', tokenCount: number = 5): Promise<PortfolioAnalysis> {
    console.log(`\n🎯 Manually generating portfolio (Risk: ${riskProfile}, Tokens: ${tokenCount})`);
    
    const portfolioAnalysis = await this.portfolioService.generateEqualAllocationPortfolio(tokenCount, riskProfile);
    
    this.currentPortfolio = portfolioAnalysis;
    this.lastPortfolioUpdate = Date.now();

    console.log("✅ Manual portfolio generation completed!");
    this.printPortfolioSummary(portfolioAnalysis);

    return portfolioAnalysis;
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

Respond with a JSON object containing:
- action: "buy", "sell", or "hold"
- token: token symbol if buying/selling (or null for hold)
- amount: percentage of SOL balance to use (1-10 for buy, or percentage to sell)
- confidence: confidence level 0-100
- reasoning: detailed explanation of your decision

Be conservative and only make high-confidence trades. If market conditions are unclear, choose "hold".`;

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
      console.log(`\n🎯 Executing Decision: ${decision.action.toUpperCase()}`);
      console.log(`💰 Token: ${decision.token || 'N/A'}`);
      console.log(`📊 Amount: ${decision.amount}%`);
      console.log(`🎯 Confidence: ${decision.confidence}%`);
      console.log(`💭 Reasoning: ${decision.reasoning}\n`);

      if (decision.action === 'hold') {
        console.log("⏸️ Holding position - no trade executed");
        return;
      }

      // Create trading prompt for the AI agent
      const tradingPrompt = `Based on my analysis, I want to ${decision.action} ${decision.token || 'tokens'}.

Analysis Summary: ${decision.reasoning}

Please:
1. Check my current SOL balance
2. ${decision.action === 'buy' ? 
    `Calculate ${decision.amount}% of my SOL balance and buy ${decision.token} tokens with that amount` :
    `Sell ${decision.amount}% of my ${decision.token} tokens`}
3. Execute the trade if the conditions look good
4. Provide a summary of the transaction

Be careful with the trade and explain each step.`;

      console.log("🤖 Executing trade with AI agent...");

      const result = await generateText({
        model: openai("gpt-4o-mini"),
        tools: this.tools,
        maxSteps: 10,
        prompt: `You are a based crypto degen assistant specialized in Solana DeFi. You help execute trades based on market analysis.

Current request: ${tradingPrompt}`,
        onStepFinish: (event) => {
          console.log("🔧 Tool execution:", JSON.stringify(event.toolResults, null, 2));
          console.log("-".repeat(30));
        },
      });

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
} 