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
      const history = this.topicHistory.get(score.topic) || [];
      history.push(score);
      
      // Keep only recent history
      if (history.length > this.maxHistoryLength) {
        history.shift();
      }
      
      this.topicHistory.set(score.topic, history);
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
    
    console.log(`😱 Updated Fear & Greed history. Current: ${fearGreedAnalysis.today.value} (${fearGreedAnalysis.today.value_classification})`);
  }

  /**
   * Analyze trends for all topics with sufficient history
   */
  analyzeTrends(): TrendAnalysis[] {
    const trends: TrendAnalysis[] = [];

    this.topicHistory.forEach((history, topic) => {
      if (history.length >= 2) {
        const trend = this.calculateTrendForTopic(topic, history);
        if (trend) {
          trends.push(trend);
        }
      }
    });

    // Sort by trend strength (absolute value)
    trends.sort((a, b) => Math.abs(b.trendStrength) - Math.abs(a.trendStrength));

    console.log(`🔍 Analyzed trends for ${trends.length} topics`);
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
    const trendStrength = previousScore === 0 
      ? (currentScore > 0 ? 100 : 0)
      : ((currentScore - previousScore) / previousScore) * 100;

    // Determine trend direction
    let trend: 'rising' | 'falling' | 'stable';
    if (Math.abs(trendStrength) < 5) {
      trend = 'stable';
    } else if (trendStrength > 0) {
      trend = 'rising';
    } else {
      trend = 'falling';
    }

    return {
      topic,
      currentScore,
      previousScore,
      trend,
      trendStrength: Math.round(trendStrength * 100) / 100 // Round to 2 decimal places
    };
  }

  /**
   * Get top trending topics (rising)
   */
  getTopTrendingTopics(limit: number = 10): TrendAnalysis[] {
    const trends = this.analyzeTrends();
    return trends
      .filter(t => t.trend === 'rising')
      .slice(0, limit);
  }

  /**
   * Get topics losing momentum (falling)
   */
  getFallingTopics(limit: number = 10): TrendAnalysis[] {
    const trends = this.analyzeTrends();
    return trends
      .filter(t => t.trend === 'falling')
      .slice(0, limit);
  }

  /**
   * Get overall market sentiment trend
   */
  getSentimentTrend(): {
    current: SentimentData | null;
    previous: SentimentData | null;
    trend: 'improving' | 'declining' | 'stable';
    change: number;
  } {
    if (this.sentimentHistory.length < 2) {
      return {
        current: this.sentimentHistory[this.sentimentHistory.length - 1] || null,
        previous: null,
        trend: 'stable',
        change: 0
      };
    }

    const current = this.sentimentHistory[this.sentimentHistory.length - 1];
    const previous = this.sentimentHistory[this.sentimentHistory.length - 2];

    const currentPositive = current.percentages.positive;
    const previousPositive = previous.percentages.positive;

    const change = currentPositive - previousPositive;

    let trend: 'improving' | 'declining' | 'stable';
    if (Math.abs(change) < 2) {
      trend = 'stable';
    } else if (change > 0) {
      trend = 'improving';
    } else {
      trend = 'declining';
    }

    return {
      current,
      previous,
      trend,
      change: Math.round(change * 100) / 100
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
    if (trend.trend === 'rising') {
      momentum += Math.abs(trend.trendStrength) * 2;
    } else if (trend.trend === 'falling') {
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
    trend: 'improving' | 'declining' | 'stable';
    averageValue: number;
    volatility: number;
  } {
    if (this.fearGreedHistory.length === 0) {
      return {
        current: null,
        trend: 'stable',
        averageValue: 50,
        volatility: 0
      };
    }

    const current = this.fearGreedHistory[this.fearGreedHistory.length - 1];
    const values = this.fearGreedHistory.map(fg => parseInt(fg.today.value));
    const averageValue = values.reduce((sum, val) => sum + val, 0) / values.length;
    
    // Calculate volatility (standard deviation)
    const variance = values.reduce((sum, val) => sum + Math.pow(val - averageValue, 2), 0) / values.length;
    const volatility = Math.sqrt(variance);

    // Determine overall trend
    let trend: 'improving' | 'declining' | 'stable' = 'stable';
    if (this.fearGreedHistory.length >= 3) {
      const recent = values.slice(-3);
      const older = values.slice(-6, -3);
      
      if (recent.length >= 2 && older.length >= 2) {
        const recentAvg = recent.reduce((sum, val) => sum + val, 0) / recent.length;
        const olderAvg = older.reduce((sum, val) => sum + val, 0) / older.length;
        const change = recentAvg - olderAvg;
        
        if (Math.abs(change) > 5) {
          trend = change > 0 ? 'improving' : 'declining';
        }
      }
    }

    return {
      current,
      trend,
      averageValue: Math.round(averageValue * 100) / 100,
      volatility: Math.round(volatility * 100) / 100
    };
  }

  /**
   * Enhanced summary stats including Fear and Greed
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
    marketCondition: 'bullish' | 'bearish' | 'neutral';
  } {
    // Existing stats
    const trends = this.analyzeTrends();
    const rising = trends.filter(t => t.trend === 'rising').length;
    const falling = trends.filter(t => t.trend === 'falling').length;
    const stable = trends.filter(t => t.trend === 'stable').length;
    
    const sentimentTrend = this.getSentimentTrend();
    const avgPopularity = trends.length > 0 
      ? trends.reduce((sum, t) => sum + t.currentScore, 0) / trends.length 
      : 0;

    // Fear and Greed stats
    const fearGreedTrend = this.getFearGreedTrend();
    const fearGreedStatus = fearGreedTrend.current 
      ? `${fearGreedTrend.current.today.value} (${fearGreedTrend.current.today.value_classification})`
      : 'N/A';

    // Determine overall market condition
    let marketCondition: 'bullish' | 'bearish' | 'neutral' = 'neutral';
    
    if (fearGreedTrend.current) {
      const fearGreedValue = parseInt(fearGreedTrend.current.today.value);
      const sentimentPositive = sentimentTrend.current?.percentages.positive || 50;
      
      // Combine Fear & Greed with sentiment and trend analysis
      const bullishSignals = [
        fearGreedValue > 60, // Greed territory
        sentimentPositive > 55, // Positive sentiment
        rising > falling, // More rising than falling topics
        fearGreedTrend.trend === 'improving'
      ].filter(Boolean).length;

      const bearishSignals = [
        fearGreedValue < 40, // Fear territory
        sentimentPositive < 45, // Negative sentiment
        falling > rising, // More falling than rising topics
        fearGreedTrend.trend === 'declining'
      ].filter(Boolean).length;

      if (bullishSignals >= 3) marketCondition = 'bullish';
      else if (bearishSignals >= 3) marketCondition = 'bearish';
    }

    return {
      totalTopicsTracked: this.topicHistory.size,
      risingTopics: rising,
      fallingTopics: falling,
      stableTopics: stable,
      avgPopularityScore: Math.round(avgPopularity * 100) / 100,
      sentimentTrend: sentimentTrend.trend,
      fearGreedStatus,
      fearGreedTrend: fearGreedTrend.trend,
      marketCondition
    };
  }
} 