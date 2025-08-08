import { TopicScore, TrendAnalysis, SentimentData, FearGreedAnalysis } from "../types/index.js";

export class TrendAnalyzer {
  private topicHistory: Map<string, TopicScore[]> = new Map();
  private sentimentHistory: SentimentData[] = [];
  private fearGreedHistory: FearGreedAnalysis[] = [];
  private readonly maxHistoryLength = 24; // Keep 24 data points (24 hours if updated hourly)

  /**
   * Add new topic scores to history
   */
  addTopicScores(topicScores: TopicScore[]): void {
    topicScores.forEach(score => {
      const oldHistory = this.topicHistory.get(score.topic) || [];
      const newHistory = [...oldHistory, score].slice(-this.maxHistoryLength);
      this.topicHistory.set(score.topic, newHistory);
    });

    console.log(`📈 Updated history for ${topicScores.length} topics`);
  }

  /**
   * Add sentiment data to history
   */
  addSentimentData(sentiment: SentimentData): void {
    this.sentimentHistory.push(sentiment);

    // Keep only recent sentiment history
    if (this.sentimentHistory.length > this.maxHistoryLength) {
      this.sentimentHistory.shift();
    }

    console.log(`📊 Added sentiment data to history (${this.sentimentHistory.length} entries)`);
  }

  /**
   * Add Fear and Greed Index analysis to history
   */
  addFearGreedAnalysis(fearGreedAnalysis: FearGreedAnalysis): void {
    this.fearGreedHistory.push(fearGreedAnalysis);

    // Keep only recent history
    if (this.fearGreedHistory.length > this.maxHistoryLength) {
      this.fearGreedHistory.shift();
    }

    console.log(
      `😱 Updated Fear & Greed history. Current: ${fearGreedAnalysis.today.value} (${fearGreedAnalysis.today.value_classification})`,
    );
  }

  /**
   * Analyze trends for all topics with sufficient history
   */
  analyzeTrends(): TrendAnalysis[] {
    const trends: TrendAnalysis[] = [];

    console.log(`\n🔍 TREND ANALYSIS STARTING`);
    console.log(`📊 Total topics in history: ${this.topicHistory.size}`);
    console.log(`📈 Sentiment history entries: ${this.sentimentHistory.length}`);
    console.log(`😱 Fear & Greed history entries: ${this.fearGreedHistory.length}`);

    let topicsWithSufficientHistory = 0;
    let topicsAnalyzed = 0;

    this.topicHistory.forEach((history, topic) => {
      console.log(`   📂 ${topic}: ${history.length} data points`);

      if (history.length >= 2) {
        topicsWithSufficientHistory++;
        const trend = this.calculateTrendForTopic(topic, history);
        if (trend) {
          trends.push(trend);
          topicsAnalyzed++;
          console.log(`   ✅ ${topic}: ${trend.trend} (${trend.trendStrength.toFixed(1)}%)`);
        } else {
          console.log(`   ⚠️ ${topic}: Could not calculate trend`);
        }
      } else {
        console.log(`   ❌ ${topic}: Insufficient history (need 2+ points)`);
      }
    });

    // Sort by trend strength (absolute value)
    trends.sort((a, b) => Math.abs(b.trendStrength) - Math.abs(a.trendStrength));

    console.log(`\n📊 TREND ANALYSIS SUMMARY:`);
    console.log(`   📈 Topics with sufficient history: ${topicsWithSufficientHistory}`);
    console.log(`   🔍 Topics successfully analyzed: ${topicsAnalyzed}`);
    console.log(`   📉 Topics with trends: ${trends.length}`);

    if (trends.length > 0) {
      console.log(`\n🚀 TOP TRENDS:`);
      trends.slice(0, 5).forEach((trend, index) => {
        const emoji = trend.trend === "rising" ? "📈" : trend.trend === "falling" ? "📉" : "➡️";
        console.log(
          `   ${index + 1}. ${emoji} ${trend.topic}: ${trend.trendStrength.toFixed(1)}% (${trend.currentScore} → ${
            trend.previousScore
          })`,
        );
      });
    } else {
      console.log(`   💡 No trends found. This could be because:`);
      console.log(`      • Topics need at least 2 data points for trend analysis`);
      console.log(`      • All topics have insufficient historical data`);
      console.log(`      • This is the first analysis cycle`);
    }

    console.log(`🔍 Trend analysis completed: ${trends.length} trends identified`);
    return trends;
  }

  /**
   * Calculate trend for a specific topic
   */
  private calculateTrendForTopic(topic: string, history: TopicScore[]): TrendAnalysis | null {
    if (history.length < 2) return null;

    const current = history[history.length - 1];
    const previous = history[history.length - 2];

    const currentScore = current.popularityScore;
    const previousScore = previous.popularityScore;

    // Calculate percentage change
    const trendStrength =
      previousScore === 0 ? (currentScore > 0 ? 100 : 0) : ((currentScore - previousScore) / previousScore) * 100;

    // Determine trend direction
    let trend: "rising" | "falling" | "stable";
    if (Math.abs(trendStrength) < 5) {
      trend = "stable";
    } else if (trendStrength > 0) {
      trend = "rising";
    } else {
      trend = "falling";
    }

    return {
      topic,
      currentScore,
      previousScore,
      trend,
      trendStrength: Math.round(trendStrength * 100) / 100, // Round to 2 decimal places
    };
  }

  /**
   * Get summary stats from cached trend analysis (avoids recalculation)
   */
  getSummaryStatsFromCache(cachedTrends: TrendAnalysis[]): {
    totalTopicsTracked: number;
    risingTopics: number;
    fallingTopics: number;
    stableTopics: number;
    avgPopularityScore: number;
    marketCondition: "bullish" | "bearish" | "neutral";
    sentimentTrend: string;
    fearGreedTrend: string;
    fearGreedStatus: string;
  } {
    const risingTopics = cachedTrends.filter(t => t.trend === "rising").length;
    const fallingTopics = cachedTrends.filter(t => t.trend === "falling").length;
    const stableTopics = cachedTrends.filter(t => t.trend === "stable").length;
    const avgPopularityScore =
      cachedTrends.length > 0 ? cachedTrends.reduce((sum, t) => sum + t.currentScore, 0) / cachedTrends.length : 0;

    // Determine market condition
    let marketCondition: "bullish" | "bearish" | "neutral";
    if (risingTopics > fallingTopics * 1.5) {
      marketCondition = "bullish";
    } else if (fallingTopics > risingTopics * 1.5) {
      marketCondition = "bearish";
    } else {
      marketCondition = "neutral";
    }

    // Get sentiment and fear/greed trends
    const sentimentTrend = this.getSentimentTrend();
    const fearGreedTrend = this.getFearGreedTrend();

    return {
      totalTopicsTracked: cachedTrends.length,
      risingTopics,
      fallingTopics,
      stableTopics,
      avgPopularityScore,
      marketCondition,
      sentimentTrend: sentimentTrend.trend,
      fearGreedTrend: fearGreedTrend.trend,
      fearGreedStatus: fearGreedTrend.current?.today.value_classification || "Unknown",
    };
  }

  /**
   * Get top trending topics (rising)
   */
  getTopTrendingTopics(limit: number = 10): TrendAnalysis[] {
    const trends = this.analyzeTrends();
    return trends.filter(t => t.trend === "rising").slice(0, limit);
  }

  /**
   * Get topics losing momentum (falling)
   */
  getFallingTopics(limit: number = 10): TrendAnalysis[] {
    const trends = this.analyzeTrends();
    return trends.filter(t => t.trend === "falling").slice(0, limit);
  }

  /**
   * Get overall market sentiment trend
   */
  getSentimentTrend(): {
    current: SentimentData | null;
    previous: SentimentData | null;
    trend: "improving" | "declining" | "stable";
    change: number;
  } {
    if (this.sentimentHistory.length < 2) {
      return {
        current: this.sentimentHistory[this.sentimentHistory.length - 1] || null,
        previous: null,
        trend: "stable",
        change: 0,
      };
    }

    const current = this.sentimentHistory[this.sentimentHistory.length - 1];
    const previous = this.sentimentHistory[this.sentimentHistory.length - 2];

    const currentPositive = current.percentages.positive;
    const previousPositive = previous.percentages.positive;

    const change = currentPositive - previousPositive;

    let trend: "improving" | "declining" | "stable";
    if (Math.abs(change) < 2) {
      trend = "stable";
    } else if (change > 0) {
      trend = "improving";
    } else {
      trend = "declining";
    }

    return {
      current,
      previous,
      trend,
      change: Math.round(change * 100) / 100,
    };
  }

  /**
   * Calculate momentum score for a topic (combines popularity and trend)
   */
  calculateMomentumScore(topic: string): number {
    const history = this.topicHistory.get(topic);
    if (!history || history.length < 2) return 0;

    const trend = this.calculateTrendForTopic(topic, history);
    if (!trend) return 0;

    // Base score from current popularity
    let momentum = trend.currentScore;

    // Boost for positive trends
    if (trend.trend === "rising") {
      momentum += Math.abs(trend.trendStrength) * 2;
    } else if (trend.trend === "falling") {
      momentum -= Math.abs(trend.trendStrength);
    }

    // Ensure non-negative
    return Math.max(0, momentum);
  }

  /**
   * Get topics ranked by momentum
   */
  getTopicsByMomentum(): Array<{ topic: string; momentum: number; trend: TrendAnalysis | null }> {
    const topics = Array.from(this.topicHistory.keys());
    const momentumData = topics.map(topic => {
      const momentum = this.calculateMomentumScore(topic);
      const history = this.topicHistory.get(topic)!;
      const trend = this.calculateTrendForTopic(topic, history);

      return { topic, momentum, trend };
    });

    return momentumData.sort((a, b) => b.momentum - a.momentum);
  }

  /**
   * Get historical data for a specific topic
   */
  getTopicHistory(topic: string): TopicScore[] {
    return this.topicHistory.get(topic) || [];
  }

  /**
   * Get current Fear and Greed status
   */
  getCurrentFearGreed(): FearGreedAnalysis | null {
    return this.fearGreedHistory.length > 0 ? this.fearGreedHistory[this.fearGreedHistory.length - 1] : null;
  }

  /**
   * Get Fear and Greed trend over time
   */
  getFearGreedTrend(): {
    current: FearGreedAnalysis | null;
    trend: "improving" | "declining" | "stable";
    averageValue: number;
    volatility: number;
  } {
    if (this.fearGreedHistory.length === 0) {
      return {
        current: null,
        trend: "stable",
        averageValue: 50,
        volatility: 0,
      };
    }

    const current = this.fearGreedHistory[this.fearGreedHistory.length - 1];
    const values = this.fearGreedHistory.map(fg => parseInt(fg.today.value));
    const averageValue = values.reduce((sum, val) => sum + val, 0) / values.length;

    // Calculate volatility (standard deviation)
    const variance = values.reduce((sum, val) => sum + Math.pow(val - averageValue, 2), 0) / values.length;
    const volatility = Math.sqrt(variance);

    // Determine overall trend
    let trend: "improving" | "declining" | "stable" = "stable";
    if (this.fearGreedHistory.length >= 3) {
      const recent = values.slice(-3);
      const older = values.slice(-6, -3);

      if (recent.length >= 2 && older.length >= 2) {
        const recentAvg = recent.reduce((sum, val) => sum + val, 0) / recent.length;
        const olderAvg = older.reduce((sum, val) => sum + val, 0) / older.length;
        const change = recentAvg - olderAvg;

        if (Math.abs(change) > 5) {
          trend = change > 0 ? "improving" : "declining";
        }
      }
    }

    return {
      current,
      trend,
      averageValue: Math.round(averageValue * 100) / 100,
      volatility: Math.round(volatility * 100) / 100,
    };
  }

  /**
   * Get overall market statistics (calls analyzeTrends internally)
   */
  getSummaryStats(): {
    totalTopicsTracked: number;
    risingTopics: number;
    fallingTopics: number;
    stableTopics: number;
    avgPopularityScore: number;
    sentimentTrend: string;
    fearGreedStatus: string;
    fearGreedTrend: string;
    marketCondition: "bullish" | "bearish" | "neutral";
  } {
    // Call analyzeTrends and then use the cache method
    const trends = this.analyzeTrends();
    return this.getSummaryStatsFromCache(trends);
  }
}
