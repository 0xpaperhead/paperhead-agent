/**
 * Utility functions for generating market insights and analysis summaries
 */

/**
 * Generate actionable market insights based on current conditions
 */
export function generateMarketInsights(stats: any, fearGreedTrend: any, sentimentTrend: any, tokenAnalysis: any): string[] {
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

/**
 * Get sentiment interpretation based on positive ratio
 */
export function getSentimentInterpretation(positiveRatio: number): string {
  if (positiveRatio > 60) return 'Very Bullish 🚀';
  if (positiveRatio > 50) return 'Bullish 📈';
  if (positiveRatio > 40) return 'Neutral ➡️';
  if (positiveRatio > 30) return 'Bearish 📉';
  return 'Very Bearish 🔻';
}

/**
 * Get Fear & Greed recommendation based on value
 */
export function getFearGreedRecommendation(fgValue: number): string {
  if (fgValue > 75) return 'Extreme greed - consider taking profits 💰';
  if (fgValue > 55) return 'Greed - good time for balanced approach ⚖️';
  if (fgValue > 45) return 'Neutral - wait for clearer signals 🤔';
  if (fgValue > 25) return 'Fear - potential buying opportunity 🛒';
  return 'Extreme fear - excellent buying opportunity 🚀';
}