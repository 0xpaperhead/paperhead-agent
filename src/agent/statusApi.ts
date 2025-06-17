import { AgenticSystem } from './agenticSystem.js';

export class StatusApi {
  private agenticSystem: AgenticSystem;

  constructor(agenticSystem: AgenticSystem) {
    this.agenticSystem = agenticSystem;
  }

  /**
   * Get system status and health information
   */
  getStatus() {
    const state = this.agenticSystem.getState();
    const now = Date.now();
    
    return {
      status: state.isRunning ? 'running' : 'stopped',
      uptime: state.isRunning ? now - state.lastUpdate : 0,
      lastUpdate: new Date(state.lastUpdate).toISOString(),
      health: {
        topicsTracked: state.currentTopics.length,
        sentimentDataPoints: state.sentimentHistory.length,
        trendsAnalyzed: state.trendAnalysis.length,
        lastDecision: state.lastDecision ? {
          action: state.lastDecision.action,
          token: state.lastDecision.token,
          confidence: state.lastDecision.confidence,
          timestamp: new Date(state.lastDecision.timestamp).toISOString()
        } : null
      },
      topTopics: state.currentTopics.slice(0, 5).map(t => ({
        topic: t.topic,
        score: t.popularityScore,
        articles: t.articles.length
      })),
      recentTrends: state.trendAnalysis.slice(0, 5).map(t => ({
        topic: t.topic,
        trend: t.trend,
        strength: t.trendStrength,
        currentScore: t.currentScore
      }))
    };
  }

  /**
   * Get detailed analytics
   */
  getAnalytics() {
    const state = this.agenticSystem.getState();
    
    return {
      topics: {
        total: state.currentTopics.length,
        byPopularity: state.currentTopics
          .sort((a, b) => b.popularityScore - a.popularityScore)
          .slice(0, 20)
          .map(t => ({ topic: t.topic, score: t.popularityScore }))
      },
      trends: {
        total: state.trendAnalysis.length,
        rising: state.trendAnalysis.filter(t => t.trend === 'rising').length,
        falling: state.trendAnalysis.filter(t => t.trend === 'falling').length,
        stable: state.trendAnalysis.filter(t => t.trend === 'stable').length,
        topRising: state.trendAnalysis
          .filter(t => t.trend === 'rising')
          .sort((a, b) => b.trendStrength - a.trendStrength)
          .slice(0, 10)
      },
      sentiment: {
        history: state.sentimentHistory.slice(-10), // Last 10 data points
        current: state.sentimentHistory[state.sentimentHistory.length - 1] || null
      },
      decisions: {
        last: state.lastDecision,
        summary: state.lastDecision ? {
          action: state.lastDecision.action,
          confidence: state.lastDecision.confidence,
          timeSince: Date.now() - state.lastDecision.timestamp
        } : null
      }
    };
  }
} 