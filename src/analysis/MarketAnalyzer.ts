import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";
import { NewsService } from './newsService.js';
import { TopicGenerator } from './topicGenerator.js';
import { TrendAnalyzer } from './trendAnalyzer.js';
import { TrendingTokensService } from './trendingTokensService.js';
import { AgentDecision, AgentState, RiskProfile } from '../types/index.js';

export class MarketAnalyzer {
  private newsService: NewsService;
  private topicGenerator: TopicGenerator;
  private trendAnalyzer: TrendAnalyzer;
  private trendingTokensService: TrendingTokensService;
  private agentState: AgentState; // Simplified state for analysis

  constructor(
    newsService: NewsService,
    topicGenerator: TopicGenerator,
    trendAnalyzer: TrendAnalyzer,
    trendingTokensService: TrendingTokensService
  ) {
    this.newsService = newsService;
    this.topicGenerator = topicGenerator;
    this.trendAnalyzer = trendAnalyzer;
    this.trendingTokensService = trendingTokensService;
    this.agentState = {
        currentTopics: [],
        sentimentHistory: [],
        trendAnalysis: [],
        lastDecision: undefined,
        isRunning: false,
        lastUpdate: 0
    };
    console.log("✅ Market Analyzer initialized.");
  }

  public async performFullAnalysis(): Promise<void> {
    const topicsToAnalyze = this.getTopicsForCurrentCycle();
    console.log(`🎯 Analyzing ${topicsToAnalyze.length} topics this cycle`);

    const [{ topicScores, sentimentData, fearGreedAnalysis }, trendingTokens] = await Promise.all([
      this.newsService.fetchAllData(topicsToAnalyze, ['24h']),
      this.trendingTokensService.fetchTrendingTokens()
    ]);

    this.agentState.currentTopics = topicScores;
    this.trendAnalyzer.addTopicScores(topicScores);

    const sentiment24h = sentimentData.get('24h');
    if (sentiment24h) {
      this.trendAnalyzer.addSentimentData(sentiment24h);
      this.agentState.sentimentHistory.push(sentiment24h);
    }

    if (fearGreedAnalysis) {
      this.trendAnalyzer.addFearGreedAnalysis(fearGreedAnalysis);
    }

    const tokenAnalysis = await this.trendingTokensService.getMarketAnalysis();

    const allHeadlines = topicScores.flatMap(ts => ts.articles.map(a => a.title));
    if (allHeadlines.length > 0) {
      try {
        const newTopics = await this.topicGenerator.extractTopicsFromHeadlines(allHeadlines);
        this.topicGenerator.addDynamicTopics(newTopics);
      } catch (error) {
        console.error("❌ Error in AI topic extraction:", error);
      }
    }

    this.agentState.trendAnalysis = this.trendAnalyzer.analyzeTrends();
    this.topicGenerator.cleanupDynamicTopics();
    this.printAnalysisSummary(tokenAnalysis);
  }

  public getAgentState(): AgentState {
    return this.agentState;
  }

  public determineRiskProfile(): RiskProfile {
    const stats = this.trendAnalyzer.getSummaryStats();
    const fearGreedTrend = this.trendAnalyzer.getFearGreedTrend();
    const sentimentTrend = this.trendAnalyzer.getSentimentTrend();

    let riskScore = 0;

    if (fearGreedTrend.current) {
      const fearGreedValue = parseInt(fearGreedTrend.current.today.value);
      if (fearGreedValue < 25) riskScore += 2;
      else if (fearGreedValue > 75) riskScore -= 2;
    }

    const positiveSentiment = sentimentTrend.current?.percentages.positive || 50;
    if (positiveSentiment > 65) riskScore += 1;
    else if (positiveSentiment < 35) riskScore -= 1;

    if (stats.marketCondition === 'bullish') riskScore += 1;
    else if (stats.marketCondition === 'bearish') riskScore -= 2;

    if (stats.risingTopics > stats.fallingTopics * 1.5) riskScore += 1;

    if (riskScore >= 2) return 'aggressive';
    if (riskScore <= -2) return 'conservative';
    return 'moderate';
  }

  public async makeAgentDecision(): Promise<AgentDecision | null> {
    try {
      console.log("\n🤖 Making Agent Decision...");
      const analysisData = await this.prepareAnalysisForAgent();
      const decision = await this.generateAgentDecision(analysisData);
      
      if (decision) {
        this.agentState.lastDecision = decision;
        console.log("💡 Agent Decision:", decision);
        return decision;
      }
      return null;
    } catch (error) {
      console.error("❌ Error making agent decision:", error);
      return null;
    }
  }

  private async generateAgentDecision(analysisData: string): Promise<AgentDecision | null> {
    try {
      const prompt = `You are a sophisticated crypto trading agent analyzing market trends and sentiment data.

${analysisData}

Based on this comprehensive analysis, make a trading decision. Consider:
1. Strong trending topics that might have associated tokens
2. Overall market sentiment and its trend
3. Risk management (never risk more than 10% of portfolio)
4. Focus on Solana ecosystem tokens when possible

IMPORTANT: Always use token CONTRACT ADDRESSES (mint addresses) instead of symbols.
- Must be valid base58-encoded Solana public keys.
- Example: DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263
- If you don't have a valid contract address, choose "hold".

Respond with a JSON object containing:
- action: "buy", "sell", or "hold"
- token: VALID token CONTRACT ADDRESS (or null for hold)
- amount: INTEGER percentage of SOL balance to use (1-10)
- confidence: confidence level 0-100
- reasoning: detailed explanation of your decision.

Be conservative. If unsure, choose "hold".`;

      const result = await generateText({
        model: openai("gpt-4o-mini"),
        prompt,
        maxTokens: 500,
      });

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
${this.agentState.currentTopics.slice(0, 10).map(t => `- ${t.topic}: ${t.popularityScore} articles`).join('\n')}

💡 TRADING SIGNALS:
${this.generateTradingSignals(fearGreedTrend, sentimentTrend, stats, tokenAnalysis)}
`;
  }

  private getTopicsForCurrentCycle(): string[] {
    const highPriority = this.topicGenerator.getHighPriorityTopics();
    const randomTopics = this.topicGenerator.getTopicsForAnalysis(15 - highPriority.length);
    return [...new Set([...highPriority, ...randomTopics])].slice(0, 15);
  }

  private printAnalysisSummary(tokenAnalysis: any): void {
    console.log("\n📊 COMPREHENSIVE ANALYSIS SUMMARY");
    console.log("=".repeat(50));

    // Use cached trend analysis instead of calling analyzeTrends again
    const trendAnalysis = this.agentState.trendAnalysis || [];
    const stats = this.trendAnalyzer.getSummaryStatsFromCache(trendAnalysis);
    const fearGreedTrend = this.trendAnalyzer.getFearGreedTrend();
    const sentimentTrend = this.trendAnalyzer.getSentimentTrend();
    
    // Market Overview
    console.log(`🎯 Market Condition: ${stats.marketCondition.toUpperCase()}`);
    console.log(`📈 Topics: ${stats.totalTopicsTracked} tracked | 🔥 ${stats.risingTopics} rising | 📉 ${stats.fallingTopics} falling`);
    console.log(`😊 Sentiment: ${stats.sentimentTrend}`);
    console.log(`😱 Fear & Greed: ${stats.fearGreedStatus} (${stats.fearGreedTrend})`);

    // Detailed Sentiment Analysis
    if (sentimentTrend.current) {
      console.log(`\n😊 SENTIMENT ANALYSIS:`);
      console.log(`   📊 Current: ${sentimentTrend.current.percentages.positive.toFixed(1)}% positive | ${sentimentTrend.current.percentages.negative.toFixed(1)}% negative`);
      console.log(`   📈 Total Articles: ${sentimentTrend.current.total}`);
      console.log(`   🔄 Trend: ${sentimentTrend.trend} (${sentimentTrend.change > 0 ? '+' : ''}${sentimentTrend.change.toFixed(1)}%)`);
      
      // Sentiment interpretation
      const positiveRatio = sentimentTrend.current.percentages.positive;
      let sentimentInterpretation = '';
      if (positiveRatio > 60) sentimentInterpretation = 'Very Bullish 🚀';
      else if (positiveRatio > 50) sentimentInterpretation = 'Bullish 📈';
      else if (positiveRatio > 40) sentimentInterpretation = 'Neutral ➡️';
      else if (positiveRatio > 30) sentimentInterpretation = 'Bearish 📉';
      else sentimentInterpretation = 'Very Bearish 🔻';
      
      console.log(`   💡 Interpretation: ${sentimentInterpretation}`);
    }

    // Use cached trend analysis for top trending topics
    const topTrending = trendAnalysis
      .filter(t => t.trend === 'rising')
      .slice(0, 5);
      
    if (topTrending.length > 0) {
      console.log("\n🚀 TOP TRENDING TOPICS:");
      topTrending.forEach((t, index) => {
        const emoji = t.trend === 'rising' ? '📈' : '📉';
        console.log(`   ${index + 1}. ${emoji} ${t.topic}: ${t.trendStrength > 0 ? '+' : ''}${t.trendStrength.toFixed(1)}% (${t.currentScore} articles)`);
      });
    } else {
      console.log("\n📈 No trending topics detected (insufficient historical data)");
    }

    const topPopular = this.agentState.currentTopics.slice(0, 5);
    if (topPopular.length > 0) {
      console.log("\n📰 MOST POPULAR TOPICS:");
      topPopular.forEach((t, index) => {
        console.log(`   ${index + 1}. ${t.topic}: ${t.popularityScore} articles`);
      });
    }

    // Fear & Greed details
    if (fearGreedTrend.current) {
      const currentFG = fearGreedTrend.current;
      console.log(`\n😱 FEAR & GREED DETAILS:`);
      console.log(`   📊 Today: ${currentFG.today.value} (${currentFG.today.value_classification})`);
      console.log(`   📊 Yesterday: ${currentFG.yesterday.value} (${currentFG.yesterday.value_classification})`);
      const change = currentFG.change ?? 0;
      console.log(`   🔄 Change: ${change > 0 ? '+' : ''}${change} points`);
      console.log(`   📈 Trend: ${fearGreedTrend.trend} | Average: ${fearGreedTrend.averageValue} | Volatility: ${fearGreedTrend.volatility}`);
      
      // Fear & Greed interpretation
      const fgValue = parseInt(currentFG.today.value);
      let fgAdvice = '';
      if (fgValue > 75) fgAdvice = 'Extreme greed - consider taking profits 💰';
      else if (fgValue > 55) fgAdvice = 'Greed - good time for balanced approach ⚖️';
      else if (fgValue > 45) fgAdvice = 'Neutral - wait for clearer signals 🤔';
      else if (fgValue > 25) fgAdvice = 'Fear - potential buying opportunity 🛒';
      else fgAdvice = 'Extreme fear - excellent buying opportunity 🚀';
      
      console.log(`   💡 Recommendation: ${fgAdvice}`);
    }

    // Enhanced Token analysis
    console.log("\n🪙 TOKEN ANALYSIS:");
    console.log(`🎯 Market Sentiment: ${tokenAnalysis.marketSentiment.toUpperCase()}`);
    console.log(`📊 Total Tokens: ${tokenAnalysis.totalTokens}`);
    console.log(`⚠️ Average Risk: ${tokenAnalysis.averageRiskScore.toFixed(1)}/10`);
    
    // Risk distribution with emojis
    console.log(`🔴 High Risk (6+): ${tokenAnalysis.riskDistribution.high} tokens`);
    console.log(`🟡 Medium Risk (3-6): ${tokenAnalysis.riskDistribution.medium} tokens`);
    console.log(`🟢 Low Risk (0-3): ${tokenAnalysis.riskDistribution.low} tokens`);

    // Top performers with more details
    if (tokenAnalysis.topPerformers && tokenAnalysis.topPerformers.length > 0) {
      console.log(`\n🚀 TOP PERFORMING TOKENS (1h):`);
      tokenAnalysis.topPerformers.slice(0, 3).forEach((token: any, index: number) => {
        const perf = token.events['1h']?.priceChangePercentage || 0;
        const risk = token.risk.score;
        const liquidity = token.pools[0]?.liquidity.usd || 0;
        console.log(`   ${index + 1}. ${token.token.symbol}: +${perf.toFixed(1)}% | Risk: ${risk}/10 | Liq: $${(liquidity/1000).toFixed(0)}K`);
      });
    }

    // Volume leaders
    if (tokenAnalysis.volumeLeaders && tokenAnalysis.volumeLeaders.length > 0) {
      console.log(`\n💰 VOLUME LEADERS (24h):`);
      tokenAnalysis.volumeLeaders.slice(0, 3).forEach((token: any, index: number) => {
        const volume = token.pools[0]?.txns.volume || 0;
        const risk = token.risk.score;
        console.log(`   ${index + 1}. ${token.token.symbol}: $${(volume/1000000).toFixed(1)}M | Risk: ${risk}/10`);
      });
    }

    // Market conditions summary
    console.log(`\n💡 MARKET INSIGHTS:`);
    const insights = this.generateMarketInsights(stats, fearGreedTrend, sentimentTrend, tokenAnalysis);
    insights.forEach((insight, index) => {
      console.log(`   ${index + 1}. ${insight}`);
    });

    console.log("=".repeat(50));
  }

  /**
   * Generate actionable market insights based on current conditions
   */
  private generateMarketInsights(stats: any, fearGreedTrend: any, sentimentTrend: any, tokenAnalysis: any): string[] {
    const insights: string[] = [];
    
    // Risk-based insights
    if (tokenAnalysis.averageRiskScore > 6) {
      insights.push('🚨 High market risk detected - consider conservative positions');
    } else if (tokenAnalysis.averageRiskScore < 3) {
      insights.push('✅ Low market risk environment - good for position building');
    }

    // Sentiment-based insights
    if (sentimentTrend.current) {
      const positiveRatio = sentimentTrend.current.percentages.positive;
      if (positiveRatio > 60 && sentimentTrend.trend === 'improving') {
        insights.push('📈 Strong positive sentiment momentum - consider increasing exposure');
      } else if (positiveRatio < 35 && sentimentTrend.trend === 'declining') {
        insights.push('📉 Negative sentiment trend - wait for reversal signals');
      }
    }

    // Fear & Greed insights
    if (fearGreedTrend.current) {
      const fgValue = parseInt(fearGreedTrend.current.today.value);
      const change = fearGreedTrend.current.change ?? 0;
      
      if (fgValue > 75 && change > 10) {
        insights.push('⚠️ Rapidly increasing greed - bubble risk increasing');
      } else if (fgValue < 25 && change < -10) {
        insights.push('🚀 Capitulation detected - potential reversal opportunity');
      }
    }

    // Market condition insights
    if (stats.marketCondition === 'bullish' && tokenAnalysis.marketSentiment === 'bullish') {
      insights.push('🎯 Aligned bullish signals - favorable for portfolio building');
    } else if (stats.marketCondition === 'bearish' && tokenAnalysis.marketSentiment === 'bearish') {
      insights.push('🛡️ Bearish alignment - defensive strategy recommended');
    } else {
      insights.push('🤔 Mixed signals - selective approach with quality tokens');
    }

    // Trending insights
    if (stats.risingTopics > stats.fallingTopics * 2) {
      insights.push('🔥 Strong momentum across topics - trend-following strategy favored');
    } else if (stats.fallingTopics > stats.risingTopics * 2) {
      insights.push('❄️ Momentum cooling - wait for stabilization');
    }

    if (insights.length === 0) {
      insights.push('📊 Market conditions are neutral - balanced approach recommended');
    }

    return insights;
  }

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
}
