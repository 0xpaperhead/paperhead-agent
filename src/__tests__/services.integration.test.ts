import { NewsService } from '../services/newsService.js';
import { TopicGenerator } from '../services/topicGenerator.js';
import { TrendAnalyzer } from '../services/trendAnalyzer.js';
import { TrendingTokensService } from '../services/trendingTokensService.js';
import { PortfolioService } from '../services/portfolioService.js';
import { Config } from '../libs/config.js';
import { describe, test, expect, beforeAll } from '@jest/globals';

describe('Services Integration Tests', () => {
  const testTimeout = 90000; // 1.5 minutes for real API calls

  beforeAll(() => {
    // Ensure required environment variables are set
    if (!Config.rapidApi.apiKey) {
      throw new Error('RAPID_API_KEY environment variable is required for integration tests');
    }
    if (!Config.solanaTracker.apiKey) {
      throw new Error('SOLANA_TRACKER_API_KEY environment variable is required for integration tests');
    }
    if (!Config.agent.openai_api_key) {
      throw new Error('OPENAI_API_KEY environment variable is required for integration tests');
    }
  });

  describe('NewsService Integration', () => {
    let newsService: NewsService;

    beforeAll(() => {
      newsService = new NewsService();
    });

    test('should fetch real news articles for Solana topics', async () => {
      const articles = await newsService.fetchTopicNews('solana', 10);
      
      expect(Array.isArray(articles)).toBe(true);
      expect(articles.length).toBeGreaterThanOrEqual(0);
      
      if (articles.length > 0) {
        const article = articles[0];
        expect(article.title).toBeDefined();
        expect(article.sentiment).toBeDefined();
        expect(['positive', 'negative', 'neutral']).toContain(article.sentiment.label);
        expect(typeof article.sentiment.score).toBe('number');
      }
    }, testTimeout);

    test('should fetch sentiment data from real API', async () => {
      const sentiment = await newsService.fetchSentiment('24h');
      
      expect(sentiment).toBeDefined();
      if (sentiment) {
        expect(sentiment.interval).toBe('24h');
        expect(typeof sentiment.total).toBe('number');
        expect(sentiment.counts).toBeDefined();
        expect(sentiment.percentages).toBeDefined();
        expect(sentiment.counts.positive + sentiment.counts.negative + sentiment.counts.neutral).toBe(sentiment.total);
      }
    }, testTimeout);

    test('should fetch Fear & Greed Index from real API', async () => {
      const fearGreed = await newsService.fetchFearGreedIndex();
      
      expect(fearGreed).toBeDefined();
      if (fearGreed) {
        const timestamps = Object.keys(fearGreed);
        expect(timestamps.length).toBeGreaterThan(0);
        
        const latestData = fearGreed[timestamps[0]];
        expect(latestData.value).toBeDefined();
        expect(latestData.value_classification).toBeDefined();
        expect(['Extreme Fear', 'Fear', 'Neutral', 'Greed', 'Extreme Greed']).toContain(latestData.value_classification);
      }
    }, testTimeout);

    test('should batch process multiple topics', async () => {
      const topics = ['solana', 'bitcoin', 'ethereum'];
      const topicScores = await newsService.batchCalculateTopicScores(topics);
      
      expect(Array.isArray(topicScores)).toBe(true);
      expect(topicScores.length).toBe(topics.length);
      
      topicScores.forEach((score, index) => {
        expect(score.topic).toBe(topics[index]);
        expect(typeof score.popularityScore).toBe('number');
        expect(score.popularityScore).toBeGreaterThanOrEqual(0);
        expect(score.popularityScore).toBeLessThanOrEqual(100);
        expect(Array.isArray(score.articles)).toBe(true);
      });
    }, testTimeout);

    test('should handle comprehensive parallel data fetch', async () => {
      const topics = ['solana', 'jupiter', 'orca'];
      const intervals: ('24h' | '48h')[] = ['24h', '48h'];
      
      const result = await newsService.fetchAllData(topics, intervals);
      
      expect(result.topicScores).toBeDefined();
      expect(result.sentimentData).toBeDefined();
      expect(result.fearGreedAnalysis).toBeDefined();
      
      expect(result.topicScores.length).toBe(topics.length);
      expect(result.sentimentData.size).toBe(intervals.length);
    }, testTimeout);
  });

  describe('TopicGenerator Integration', () => {
    let topicGenerator: TopicGenerator;

    beforeAll(() => {
      topicGenerator = new TopicGenerator();
    });

    test('should have predefined Solana topics', () => {
      const allTopics = topicGenerator.getAllTopics();
      expect(allTopics.length).toBeGreaterThan(50);
      expect(allTopics).toContain('solana');
      expect(allTopics).toContain('jupiter');
      expect(allTopics).toContain('orca');
    });

    test('should extract topics from real headlines using AI', async () => {
      const headlines = [
        'Jupiter DEX announces new staking rewards for JUP token holders',
        'Orca protocol launches new liquidity mining campaign',
        'Solana validators prepare for upcoming network upgrade',
        'Bonk memecoin sees massive surge in trading volume'
      ];
      
      const extractedTopics = await topicGenerator.extractTopicsFromHeadlines(headlines);
      
      expect(Array.isArray(extractedTopics)).toBe(true);
      expect(extractedTopics.length).toBeGreaterThan(0);
      
      // Should extract relevant Solana terms
      const relevantTopics = extractedTopics.filter(topic => 
        ['jupiter', 'jup', 'orca', 'solana', 'bonk', 'validators', 'staking'].includes(topic.toLowerCase())
      );
      expect(relevantTopics.length).toBeGreaterThan(0);
    }, testTimeout);

    test('should get topics for analysis', () => {
      const topics = topicGenerator.getTopicsForAnalysis(10);
      expect(topics.length).toBe(10);
      expect(topics.every(topic => typeof topic === 'string')).toBe(true);
    });

    test('should manage dynamic topics', async () => {
      const initialTopics = topicGenerator.getAllTopics();
      
      // Add some dynamic topics
      topicGenerator.addDynamicTopics(['testtoken', 'newprotocol', 'defi']);
      
      const updatedTopics = topicGenerator.getAllTopics();
      expect(updatedTopics.length).toBeGreaterThan(initialTopics.length);
      expect(updatedTopics).toContain('testtoken');
      expect(updatedTopics).toContain('newprotocol');
      expect(updatedTopics).toContain('defi');
    });

    test('should categorize topics correctly', () => {
      const categorized = topicGenerator.getCategorizedTopics();
      
      expect(categorized.defi).toContain('jupiter');
      expect(categorized.defi).toContain('orca');
      expect(categorized.memecoins).toContain('bonk');
      expect(categorized.infrastructure).toContain('solana');
      expect(categorized.tools).toContain('phantom');
    });
  });

  describe('TrendAnalyzer Integration', () => {
    let trendAnalyzer: TrendAnalyzer;

    beforeAll(() => {
      trendAnalyzer = new TrendAnalyzer();
    });

    test('should analyze trends from real data', async () => {
      // Add some sample data
      const topicScores = [
        { topic: 'solana', popularityScore: 85, articles: [], timestamp: Date.now() },
        { topic: 'jupiter', popularityScore: 72, articles: [], timestamp: Date.now() },
        { topic: 'orca', popularityScore: 65, articles: [], timestamp: Date.now() }
      ];
      
      trendAnalyzer.addTopicScores(topicScores);
      
      // Add second set with different scores
      const updatedScores = [
        { topic: 'solana', popularityScore: 90, articles: [], timestamp: Date.now() + 1000 },
        { topic: 'jupiter', popularityScore: 68, articles: [], timestamp: Date.now() + 1000 },
        { topic: 'orca', popularityScore: 70, articles: [], timestamp: Date.now() + 1000 }
      ];
      
      trendAnalyzer.addTopicScores(updatedScores);
      
      const trends = trendAnalyzer.analyzeTrends();
      expect(trends.length).toBeGreaterThan(0);
      
      trends.forEach(trend => {
        expect(trend.topic).toBeDefined();
        expect(typeof trend.currentScore).toBe('number');
        expect(typeof trend.previousScore).toBe('number');
        expect(['rising', 'falling', 'stable']).toContain(trend.trend);
        expect(typeof trend.trendStrength).toBe('number');
      });
    });

    test('should handle sentiment data', () => {
      const sentiment = {
        interval: '24h' as const,
        total: 100,
        counts: { positive: 45, negative: 30, neutral: 25 },
        percentages: { positive: 45, negative: 30, neutral: 25 }
      };
      
      trendAnalyzer.addSentimentData(sentiment);
      
      const sentimentTrend = trendAnalyzer.getSentimentTrend();
      expect(sentimentTrend.current).toBeDefined();
      expect(sentimentTrend.current?.percentages.positive).toBe(45);
    });

    test('should handle Fear & Greed data', () => {
      const fearGreed = {
        today: { value: '75', value_classification: 'Greed' as const, timestamp: new Date().toISOString() },
        yesterday: { value: '65', value_classification: 'Greed' as const, timestamp: new Date(Date.now() - 86400000).toISOString() },
        change: 10,
        trend: 'increasing' as const,
        classification: 'Greed'
      };
      
      trendAnalyzer.addFearGreedAnalysis(fearGreed);
      
      const fearGreedTrend = trendAnalyzer.getFearGreedTrend();
      expect(fearGreedTrend.current).toBeDefined();
      expect(fearGreedTrend.current?.today.value).toBe('75');
    });

    test('should calculate market conditions', () => {
      const stats = trendAnalyzer.getSummaryStats();
      
      expect(typeof stats.totalTopicsTracked).toBe('number');
      expect(typeof stats.risingTopics).toBe('number');
      expect(typeof stats.fallingTopics).toBe('number');
      expect(typeof stats.stableTopics).toBe('number');
      expect(['bullish', 'bearish', 'neutral']).toContain(stats.marketCondition);
    });
  });

  describe('TrendingTokensService Integration', () => {
    let trendingTokensService: TrendingTokensService;

    beforeAll(() => {
      trendingTokensService = new TrendingTokensService();
    });

    test('should fetch real trending tokens', async () => {
      const tokens = await trendingTokensService.fetchTrendingTokens();
      
      expect(Array.isArray(tokens)).toBe(true);
      expect(tokens.length).toBeGreaterThan(0);
      
      if (tokens.length > 0) {
        const token = tokens[0];
        expect(token.token).toBeDefined();
        expect(token.pools).toBeDefined();
        expect(token.events).toBeDefined();
        expect(token.risk).toBeDefined();
        
        expect(token.token.symbol).toBeDefined();
        expect(token.token.mint).toBeDefined();
        expect(token.token.name).toBeDefined();
        expect(token.risk.score).toBeGreaterThanOrEqual(0);
        expect(token.risk.score).toBeLessThanOrEqual(10);
      }
    }, testTimeout);

    test('should get market analysis from real data', async () => {
      const analysis = await trendingTokensService.getMarketAnalysis();
      
      expect(analysis.totalTokens).toBeGreaterThan(0);
      expect(['bullish', 'bearish', 'neutral']).toContain(analysis.marketSentiment);
      expect(analysis.averageRiskScore).toBeGreaterThanOrEqual(0);
      expect(analysis.averageRiskScore).toBeLessThanOrEqual(10);
      expect(analysis.riskDistribution).toBeDefined();
      expect(analysis.riskDistribution.low + analysis.riskDistribution.medium + analysis.riskDistribution.high).toBe(analysis.totalTokens);
    }, testTimeout);

    test('should get top momentum tokens', async () => {
      const momentumTokens = await trendingTokensService.getTopMomentumTokens(5, '1h');
      
      expect(Array.isArray(momentumTokens)).toBe(true);
      expect(momentumTokens.length).toBeGreaterThan(0);
      
      momentumTokens.forEach(token => {
        expect(token.events['1h']).toBeDefined();
        expect(typeof token.events['1h']?.priceChangePercentage).toBe('number');
      });
    }, testTimeout);

    test('should analyze token opportunities', async () => {
      const tokens = await trendingTokensService.fetchTrendingTokens();
      
      if (tokens.length > 0) {
        const analysis = trendingTokensService.analyzeTokenOpportunity(tokens[0]);
        
        expect(analysis.score).toBeGreaterThanOrEqual(0);
        expect(analysis.score).toBeLessThanOrEqual(100);
        expect(['buy', 'hold', 'avoid']).toContain(analysis.recommendation);
        expect(Array.isArray(analysis.signals)).toBe(true);
        expect(Array.isArray(analysis.risks)).toBe(true);
      }
    }, testTimeout);

    test('should get low-risk tokens', async () => {
      const lowRiskTokens = await trendingTokensService.getLowRiskTrendingTokens(3);
      
      expect(Array.isArray(lowRiskTokens)).toBe(true);
      lowRiskTokens.forEach(token => {
        expect(token.risk.score).toBeLessThanOrEqual(4);
      });
    }, testTimeout);

    test('should get high-liquidity tokens', async () => {
      const highLiquidityTokens = await trendingTokensService.getHighLiquidityTokens(3);
      
      expect(Array.isArray(highLiquidityTokens)).toBe(true);
      highLiquidityTokens.forEach(token => {
        expect(token.pools.length).toBeGreaterThan(0);
        expect(token.pools[0].liquidity.usd).toBeGreaterThan(500000);
      });
    }, testTimeout);
  });

  describe('PortfolioService Integration', () => {
    let portfolioService: PortfolioService;
    let trendingTokensService: TrendingTokensService;
    let trendAnalyzer: TrendAnalyzer;

    beforeAll(() => {
      trendingTokensService = new TrendingTokensService();
      trendAnalyzer = new TrendAnalyzer();
      portfolioService = new PortfolioService(trendingTokensService, trendAnalyzer);
    });

    test('should generate portfolio with real market data', async () => {
      const portfolio = await portfolioService.generateEqualAllocationPortfolio(3, 'moderate');
      
      expect(portfolio.portfolio).toBeDefined();
      expect(portfolio.analysis).toBeDefined();
      expect(portfolio.portfolio.tokens).toHaveLength(3);
      
      // Verify allocation adds up to 100%
      const totalAllocation = portfolio.portfolio.tokens.reduce((sum, token) => sum + token.allocation, 0);
      expect(totalAllocation).toBeCloseTo(100, 1);
      
      // Verify token properties
      portfolio.portfolio.tokens.forEach(token => {
        expect(token.symbol).toBeDefined();
        expect(token.mint).toBeDefined();
        expect(token.name).toBeDefined();
        expect(token.reasoning).toBeDefined();
        expect(token.allocation).toBeCloseTo(33.33, 1);
        expect(token.riskScore).toBeGreaterThanOrEqual(0);
        expect(token.riskScore).toBeLessThanOrEqual(10);
        expect(token.confidence).toBeGreaterThanOrEqual(0);
        expect(token.confidence).toBeLessThanOrEqual(100);
      });
    }, testTimeout);

    test('should generate different risk profiles', async () => {
      const [conservative, moderate, aggressive] = await Promise.all([
        portfolioService.generateEqualAllocationPortfolio(3, 'conservative'),
        portfolioService.generateEqualAllocationPortfolio(3, 'moderate'),
        portfolioService.generateEqualAllocationPortfolio(3, 'aggressive')
      ]);
      
      expect(conservative.portfolio.metadata.riskProfile).toBe('conservative');
      expect(moderate.portfolio.metadata.riskProfile).toBe('moderate');
      expect(aggressive.portfolio.metadata.riskProfile).toBe('aggressive');
      
      // Conservative should generally have lower risk scores
      const conservativeAvgRisk = conservative.analysis.averageRiskScore;
      const moderateAvgRisk = moderate.analysis.averageRiskScore;
      
      expect(conservativeAvgRisk).toBeLessThanOrEqual(moderateAvgRisk + 2); // Allow some flexibility
    }, testTimeout);

    test('should provide meaningful portfolio analysis', async () => {
      const portfolio = await portfolioService.generateEqualAllocationPortfolio(5, 'moderate');
      const analysis = portfolio.analysis;
      
      expect(analysis.averageRiskScore).toBeGreaterThanOrEqual(0);
      expect(analysis.averageRiskScore).toBeLessThanOrEqual(10);
      expect(analysis.averageMomentumScore).toBeGreaterThanOrEqual(0);
      expect(analysis.averageMomentumScore).toBeLessThanOrEqual(100);
      expect(analysis.averageSentimentScore).toBeGreaterThanOrEqual(0);
      expect(analysis.averageSentimentScore).toBeLessThanOrEqual(100);
      expect(analysis.diversificationScore).toBeGreaterThanOrEqual(0);
      expect(analysis.diversificationScore).toBeLessThanOrEqual(100);
      expect(analysis.marketAlignmentScore).toBeGreaterThanOrEqual(0);
      expect(analysis.marketAlignmentScore).toBeLessThanOrEqual(100);
      expect(['build', 'wait', 'adjust']).toContain(analysis.recommendedAction);
      expect(Array.isArray(analysis.warnings)).toBe(true);
      expect(Array.isArray(analysis.strengths)).toBe(true);
    }, testTimeout);
  });

  describe('Service Integration and Data Flow', () => {
    test('should integrate services for complete market analysis', async () => {
      const newsService = new NewsService();
      const topicGenerator = new TopicGenerator();
      const trendAnalyzer = new TrendAnalyzer();
      const trendingTokensService = new TrendingTokensService();
      
      // Simulate the full data flow
      const topics = topicGenerator.getTopicsForAnalysis(5);
      const { topicScores, sentimentData, fearGreedAnalysis } = await newsService.fetchAllData(topics);
      
      trendAnalyzer.addTopicScores(topicScores);
      
      sentimentData.forEach(sentiment => {
        if (sentiment) {
          trendAnalyzer.addSentimentData(sentiment);
        }
      });
      
      if (fearGreedAnalysis) {
        trendAnalyzer.addFearGreedAnalysis(fearGreedAnalysis);
      }
      
      const trends = trendAnalyzer.analyzeTrends();
      const marketAnalysis = await trendingTokensService.getMarketAnalysis();
      const stats = trendAnalyzer.getSummaryStats();
      
      expect(Array.isArray(trends)).toBe(true);
      expect(marketAnalysis.totalTokens).toBeGreaterThan(0);
      expect(['bullish', 'bearish', 'neutral']).toContain(stats.marketCondition);
    }, testTimeout);
  });
});