/* eslint-disable @typescript-eslint/no-explicit-any */
import { NewsService } from "./newsService.js";
import { TopicGenerator } from "./topicGenerator.js";
import { TrendAnalyzer } from "./trendAnalyzer.js";
import { TrendingTokensService } from "./trendingTokensService.js";
import { AgentState, RiskProfile } from "../types/index.js";
import {
  generateMarketInsights,
  getSentimentInterpretation,
  getFearGreedRecommendation,
} from "../utils/marketInsights.js";

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
    trendingTokensService: TrendingTokensService,
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
      lastUpdate: 0,
    };
    console.log("✅ Market Analyzer initialized.");
  }

  public async performFullAnalysis(): Promise<void> {
    const topicsToAnalyze = this.topicGenerator.getTopicsForCurrentCycle();
    console.log(`🎯 Analyzing ${topicsToAnalyze.length} topics this cycle`);

    const [{ topicScores, sentimentData, fearGreedAnalysis }] = await Promise.all([
      this.newsService.fetchAllData(topicsToAnalyze, ["24h"]),
      this.trendingTokensService.fetchTrendingTokens(),
    ]);

    this.agentState.currentTopics = topicScores;
    this.trendAnalyzer.addTopicScores(topicScores);

    const sentiment24h = sentimentData.get("24h");
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

    if (stats.marketCondition === "bullish") riskScore += 1;
    else if (stats.marketCondition === "bearish") riskScore -= 2;

    if (stats.risingTopics > stats.fallingTopics * 1.5) riskScore += 1;

    if (riskScore >= 2) return "aggressive";
    if (riskScore <= -2) return "conservative";
    return "moderate";
  }

  private printAnalysisSummary(tokenAnalysis: any): void {
    console.log("\n📊 COMPREHENSIVE ANALYSIS SUMMARY");
    console.log("=".repeat(50));

    // Use cached trend analysis to avoid duplicate calls
    const trendAnalysis = this.agentState.trendAnalysis || [];
    const stats = this.trendAnalyzer.getSummaryStatsFromCache(trendAnalysis);
    const fearGreedTrend = this.trendAnalyzer.getFearGreedTrend();
    const sentimentTrend = this.trendAnalyzer.getSentimentTrend();

    // Market Overview
    console.log(`🎯 Market Condition: ${stats.marketCondition.toUpperCase()}`);
    console.log(
      `📈 Topics: ${stats.totalTopicsTracked} tracked | 🔥 ${stats.risingTopics} rising | 📉 ${stats.fallingTopics} falling`,
    );
    console.log(`😊 Sentiment: ${stats.sentimentTrend}`);
    console.log(`😱 Fear & Greed: ${stats.fearGreedStatus} (${stats.fearGreedTrend})`);

    // Detailed Sentiment Analysis
    if (sentimentTrend.current) {
      console.log(`\n😊 SENTIMENT ANALYSIS:`);
      console.log(
        `   📊 Current: ${sentimentTrend.current.percentages.positive.toFixed(
          1,
        )}% positive | ${sentimentTrend.current.percentages.negative.toFixed(1)}% negative`,
      );
      console.log(`   📈 Total Articles: ${sentimentTrend.current.total}`);
      console.log(
        `   🔄 Trend: ${sentimentTrend.trend} (${sentimentTrend.change > 0 ? "+" : ""}${sentimentTrend.change.toFixed(
          1,
        )}%)`,
      );

      // Sentiment interpretation
      const positiveRatio = sentimentTrend.current.percentages.positive;
      console.log(`   💡 Interpretation: ${getSentimentInterpretation(positiveRatio)}`);
    }

    // Use cached trend analysis for top trending topics
    const topTrending = trendAnalysis.filter(t => t.trend === "rising").slice(0, 5);

    if (topTrending.length > 0) {
      console.log("\n🚀 TOP TRENDING TOPICS:");
      topTrending.forEach((t, index) => {
        const emoji = t.trend === "rising" ? "📈" : "📉";
        console.log(
          `   ${index + 1}. ${emoji} ${t.topic}: ${t.trendStrength > 0 ? "+" : ""}${t.trendStrength.toFixed(1)}% (${
            t.currentScore
          } articles)`,
        );
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
      console.log(`   🔄 Change: ${change > 0 ? "+" : ""}${change} points`);
      console.log(
        `   📈 Trend: ${fearGreedTrend.trend} | Average: ${fearGreedTrend.averageValue} | Volatility: ${fearGreedTrend.volatility}`,
      );

      // Fear & Greed interpretation
      const fgValue = parseInt(currentFG.today.value);
      console.log(`   💡 Recommendation: ${getFearGreedRecommendation(fgValue)}`);
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
        const perf = token.events["1h"]?.priceChangePercentage || 0;
        const risk = token.risk.score;
        const liquidity = token.pools[0]?.liquidity.usd || 0;
        console.log(
          `   ${index + 1}. ${token.token.symbol}: +${perf.toFixed(1)}% | Risk: ${risk}/10 | Liq: $${(
            liquidity / 1000
          ).toFixed(0)}K`,
        );
      });
    }

    // Volume leaders
    if (tokenAnalysis.volumeLeaders && tokenAnalysis.volumeLeaders.length > 0) {
      console.log(`\n💰 VOLUME LEADERS (24h):`);
      tokenAnalysis.volumeLeaders.slice(0, 3).forEach((token: any, index: number) => {
        const volume = token.pools[0]?.txns.volume || 0;
        const risk = token.risk.score;
        console.log(`   ${index + 1}. ${token.token.symbol}: $${(volume / 1000000).toFixed(1)}M | Risk: ${risk}/10`);
      });
    }

    // Market conditions summary
    console.log(`\n💡 MARKET INSIGHTS:`);
    const insights = generateMarketInsights(stats, fearGreedTrend, sentimentTrend, tokenAnalysis);
    insights.forEach((insight, index) => {
      console.log(`   ${index + 1}. ${insight}`);
    });

    console.log("=".repeat(50));
  }
}
