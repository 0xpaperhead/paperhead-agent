import { AgenticSystem } from '../agent/agenticSystem.js';
import { NewsService } from '../services/newsService.js';
import { TrendAnalyzer } from '../services/trendAnalyzer.js';
import { TrendingTokensService } from '../services/trendingTokensService.js';
import { describe, test, expect, beforeAll } from '@jest/globals';
import { expectValidPercentage, expectValidPriceChange, delay } from './setup.js';

describe('Market Conditions Integration Tests', () => {
  let agenticSystem: AgenticSystem;
  let newsService: NewsService;
  let trendAnalyzer: TrendAnalyzer;
  let trendingTokensService: TrendingTokensService;
  const testTimeout = 120000; // 2 minutes

  beforeAll(async () => {
    console.log('📊 Starting Market Conditions Integration Tests');
    console.log('🌐 Testing real market condition detection and response');
    
    agenticSystem = new AgenticSystem();
    newsService = new NewsService();
    trendAnalyzer = new TrendAnalyzer();
    trendingTokensService = new TrendingTokensService();
    
    await agenticSystem.initialize();
  }, testTimeout);

  describe('Real Market Sentiment Analysis', () => {
    test('should detect current market sentiment accurately', async () => {
      console.log('😊 Testing market sentiment detection...');
      
      const sentiment = await newsService.fetchSentiment('24h');
      
      expect(sentiment).toBeDefined();
      if (sentiment) {
        expectValidPercentage(sentiment.percentages.positive);
        expectValidPercentage(sentiment.percentages.negative);
        expectValidPercentage(sentiment.percentages.neutral);
        
        // Percentages should add up to 100
        const total = sentiment.percentages.positive + sentiment.percentages.negative + sentiment.percentages.neutral;
        expect(total).toBeCloseTo(100, 1);
        
        console.log(`📊 Current sentiment: ${sentiment.percentages.positive}% positive, ${sentiment.percentages.negative}% negative, ${sentiment.percentages.neutral}% neutral`);
      }
      
      console.log('✅ Market sentiment detection successful');
    }, testTimeout);

    test('should track Fear & Greed Index changes', async () => {
      console.log('😱 Testing Fear & Greed Index tracking...');
      
      const fearGreedData = await newsService.fetchFearGreedIndex();
      
      expect(fearGreedData).toBeDefined();
      if (fearGreedData) {
        const analysis = newsService.analyzeFearGreedTrend(fearGreedData);
        
        expect(analysis).toBeDefined();
        if (analysis) {
          expect(analysis.today.value).toBeDefined();
          expect(analysis.yesterday.value).toBeDefined();
          expect(['Extreme Fear', 'Fear', 'Neutral', 'Greed', 'Extreme Greed']).toContain(analysis.today.value_classification);
          expect(['increasing', 'decreasing', 'stable']).toContain(analysis.trend);
          
          console.log(`📊 Fear & Greed: ${analysis.today.value} (${analysis.today.value_classification})`);
          console.log(`📈 Trend: ${analysis.trend} (${analysis.change > 0 ? '+' : ''}${analysis.change})`);
        }
      }
      
      console.log('✅ Fear & Greed Index tracking successful');
    }, testTimeout);

    test('should analyze trending topics with real news', async () => {
      console.log('📰 Testing trending topics analysis...');
      
      const solanaTopics = ['solana', 'jupiter', 'orca', 'bonk', 'jup'];
      const topicScores = await newsService.batchCalculateTopicScores(solanaTopics);
      
      expect(topicScores).toHaveLength(solanaTopics.length);
      
      // Add to trend analyzer
      trendAnalyzer.addTopicScores(topicScores);
      
      // Simulate second data point for trend analysis
      await delay(1000);
      const updatedScores = await newsService.batchCalculateTopicScores(solanaTopics);
      trendAnalyzer.addTopicScores(updatedScores);
      
      const trends = trendAnalyzer.analyzeTrends();
      expect(trends.length).toBeGreaterThan(0);
      
      console.log('📊 Top trending topics:');
      trends.slice(0, 3).forEach(trend => {
        console.log(`  ${trend.topic}: ${trend.trendStrength > 0 ? '+' : ''}${trend.trendStrength.toFixed(1)}% (${trend.trend})`);
      });
      
      console.log('✅ Trending topics analysis successful');
    }, testTimeout);

    test('should determine market conditions correctly', async () => {
      console.log('🎯 Testing market condition determination...');
      
      // Get comprehensive market data
      const [sentiment, fearGreedData, tokens] = await Promise.all([
        newsService.fetchSentiment('24h'),
        newsService.fetchFearGreedIndex(),
        trendingTokensService.fetchTrendingTokens()
      ]);
      
      // Add data to analyzer
      if (sentiment) {
        trendAnalyzer.addSentimentData(sentiment);
      }
      
      if (fearGreedData) {
        const analysis = newsService.analyzeFearGreedTrend(fearGreedData);
        if (analysis) {
          trendAnalyzer.addFearGreedAnalysis(analysis);
        }
      }
      
      // Get market summary
      const stats = trendAnalyzer.getSummaryStats();
      
      expect(['bullish', 'bearish', 'neutral']).toContain(stats.marketCondition);
      expect(stats.sentimentTrend).toBeDefined();
      expect(stats.fearGreedTrend).toBeDefined();
      
      console.log(`📊 Market condition: ${stats.marketCondition.toUpperCase()}`);
      console.log(`😊 Sentiment trend: ${stats.sentimentTrend}`);
      console.log(`😱 Fear & Greed trend: ${stats.fearGreedTrend}`);
      
      console.log('✅ Market condition determination successful');
    }, testTimeout);
  });

  describe('Token Market Analysis', () => {
    test('should analyze current token market conditions', async () => {
      console.log('🪙 Testing token market analysis...');
      
      const tokens = await trendingTokensService.fetchTrendingTokens();
      const analysis = await trendingTokensService.getMarketAnalysis();
      
      expect(analysis.totalTokens).toBeGreaterThan(0);
      expect(['bullish', 'bearish', 'neutral']).toContain(analysis.marketSentiment);
      expect(analysis.averageRiskScore).toBeGreaterThanOrEqual(0);
      expect(analysis.averageRiskScore).toBeLessThanOrEqual(10);
      
      console.log(`📊 Token market: ${analysis.marketSentiment.toUpperCase()}`);
      console.log(`⚠️  Average risk: ${analysis.averageRiskScore.toFixed(1)}/10`);
      console.log(`📈 Total tokens: ${analysis.totalTokens}`);
      
      console.log('✅ Token market analysis successful');
    }, testTimeout);

    test('should identify high-momentum tokens', async () => {
      console.log('🚀 Testing high-momentum token identification...');
      
      const momentumTokens = await trendingTokensService.getTopMomentumTokens(10, '1h');
      
      expect(momentumTokens.length).toBeGreaterThan(0);
      
      console.log('🚀 Top momentum tokens (1h):');
      momentumTokens.slice(0, 5).forEach((token, index) => {
        const change = token.events['1h']?.priceChangePercentage || 0;
        expectValidPriceChange(change);
        console.log(`  ${index + 1}. ${token.token.symbol}: ${change > 0 ? '+' : ''}${change.toFixed(2)}%`);
      });
      
      console.log('✅ High-momentum token identification successful');
    }, testTimeout);

    test('should assess token risk accurately', async () => {
      console.log('⚠️  Testing token risk assessment...');
      
      const tokens = await trendingTokensService.fetchTrendingTokens();
      const lowRiskTokens = await trendingTokensService.getLowRiskTrendingTokens(5);
      
      expect(lowRiskTokens.length).toBeGreaterThan(0);
      
      console.log('🛡️  Low-risk tokens:');
      lowRiskTokens.forEach((token, index) => {
        expect(token.risk.score).toBeLessThanOrEqual(4);
        console.log(`  ${index + 1}. ${token.token.symbol}: Risk ${token.risk.score}/10`);
      });
      
      // Test risk distribution
      const riskDistribution = tokens.reduce((acc, token) => {
        if (token.risk.score <= 3) acc.low++;
        else if (token.risk.score <= 6) acc.medium++;
        else acc.high++;
        return acc;
      }, { low: 0, medium: 0, high: 0 });
      
      console.log(`📊 Risk distribution: ${riskDistribution.low} low, ${riskDistribution.medium} medium, ${riskDistribution.high} high`);
      
      console.log('✅ Token risk assessment successful');
    }, testTimeout);

    test('should evaluate liquidity conditions', async () => {
      console.log('💧 Testing liquidity evaluation...');
      
      const highLiquidityTokens = await trendingTokensService.getHighLiquidityTokens(5);
      
      expect(highLiquidityTokens.length).toBeGreaterThan(0);
      
      console.log('💧 High-liquidity tokens:');
      highLiquidityTokens.forEach((token, index) => {
        const liquidity = token.pools[0]?.liquidity.usd || 0;
        expect(liquidity).toBeGreaterThan(500000);
        console.log(`  ${index + 1}. ${token.token.symbol}: $${(liquidity / 1000000).toFixed(2)}M`);
      });
      
      console.log('✅ Liquidity evaluation successful');
    }, testTimeout);
  });

  describe('Market Condition Response', () => {
    test('should adapt portfolio strategy to market conditions', async () => {
      console.log('🎯 Testing portfolio adaptation to market conditions...');
      
      // Test different market scenarios
      const scenarios = [
        { risk: 'conservative', expectedBehavior: 'Lower risk tolerance' },
        { risk: 'moderate', expectedBehavior: 'Balanced approach' },
        { risk: 'aggressive', expectedBehavior: 'Higher risk tolerance' }
      ];
      
      const portfolios = await Promise.all(
        scenarios.map(scenario => 
          agenticSystem.generatePortfolioNow(scenario.risk as any, 3)
        )
      );
      
      console.log('📊 Portfolio adaptation results:');
      portfolios.forEach((portfolio, index) => {
        const scenario = scenarios[index];
        const avgRisk = portfolio.analysis.averageRiskScore;
        
        console.log(`  ${scenario.risk}: Avg risk ${avgRisk.toFixed(1)}/10 - ${scenario.expectedBehavior}`);
        
        expect(portfolio.portfolio.metadata.riskProfile).toBe(scenario.risk);
        expect(avgRisk).toBeGreaterThanOrEqual(0);
        expect(avgRisk).toBeLessThanOrEqual(10);
      });
      
      // Conservative should generally have lower risk than aggressive
      const conservativeRisk = portfolios[0].analysis.averageRiskScore;
      const aggressiveRisk = portfolios[2].analysis.averageRiskScore;
      
      // Allow some flexibility due to market conditions
      expect(conservativeRisk).toBeLessThanOrEqual(aggressiveRisk + 2);
      
      console.log('✅ Portfolio adaptation successful');
    }, testTimeout);

    test('should provide market-aware recommendations', async () => {
      console.log('💡 Testing market-aware recommendations...');
      
      const portfolio = await agenticSystem.generatePortfolioNow('moderate', 5);
      const analysis = portfolio.analysis;
      
      // Recommendations should be market-aware
      expect(['build', 'wait', 'adjust']).toContain(analysis.recommendedAction);
      
      // Should have market alignment score
      expect(analysis.marketAlignmentScore).toBeGreaterThan(0);
      expect(analysis.marketAlignmentScore).toBeLessThanOrEqual(100);
      
      console.log(`📊 Market alignment: ${analysis.marketAlignmentScore}/100`);
      console.log(`💡 Recommendation: ${analysis.recommendedAction.toUpperCase()}`);
      
      if (analysis.strengths.length > 0) {
        console.log('✅ Market strengths detected:', analysis.strengths.slice(0, 2).join(', '));
      }
      
      if (analysis.warnings.length > 0) {
        console.log('⚠️  Market warnings:', analysis.warnings.slice(0, 2).join(', '));
      }
      
      console.log('✅ Market-aware recommendations successful');
    }, testTimeout);

    test('should handle volatile market conditions', async () => {
      console.log('⚡ Testing volatile market handling...');
      
      // Generate multiple portfolios to test consistency
      const portfolios = await Promise.all([
        agenticSystem.generatePortfolioNow('moderate', 4),
        agenticSystem.generatePortfolioNow('moderate', 4),
        agenticSystem.generatePortfolioNow('moderate', 4)
      ]);
      
      // All should succeed despite potential volatility
      portfolios.forEach((portfolio, index) => {
        expect(portfolio.portfolio.tokens).toHaveLength(4);
        expect(portfolio.analysis.averageRiskScore).toBeGreaterThanOrEqual(0);
        expect(portfolio.analysis.averageRiskScore).toBeLessThanOrEqual(10);
        
        console.log(`  Portfolio ${index + 1}: ${portfolio.analysis.averageRiskScore.toFixed(1)} avg risk, ${portfolio.analysis.recommendedAction} action`);
      });
      
      console.log('✅ Volatile market handling successful');
    }, testTimeout);
  });

  describe('Real-Time Market Data', () => {
    test('should process real-time price changes', async () => {
      console.log('📊 Testing real-time price change processing...');
      
      const tokens = await trendingTokensService.fetchTrendingTokens();
      
      // Verify price change data is available
      const tokensWithPriceData = tokens.filter(token => token.events['1h']?.priceChangePercentage !== undefined);
      expect(tokensWithPriceData.length).toBeGreaterThan(0);
      
      console.log('📈 Recent price changes (1h):');
      tokensWithPriceData.slice(0, 5).forEach(token => {
        const change = token.events['1h']!.priceChangePercentage;
        expectValidPriceChange(change);
        console.log(`  ${token.token.symbol}: ${change > 0 ? '+' : ''}${change.toFixed(2)}%`);
      });
      
      console.log('✅ Real-time price change processing successful');
    }, testTimeout);

    test('should integrate multiple data sources', async () => {
      console.log('🌐 Testing multiple data source integration...');
      
      const topics = ['solana', 'jupiter', 'orca'];
      const comprehensiveData = await newsService.fetchAllData(topics, ['24h']);
      
      expect(comprehensiveData.topicScores).toHaveLength(topics.length);
      expect(comprehensiveData.sentimentData.size).toBeGreaterThan(0);
      
      console.log('📊 Data integration summary:');
      console.log(`  Topics: ${comprehensiveData.topicScores.length}`);
      console.log(`  Sentiment intervals: ${comprehensiveData.sentimentData.size}`);
      console.log(`  Fear & Greed: ${comprehensiveData.fearGreedAnalysis ? 'Available' : 'Not available'}`);
      
      console.log('✅ Multiple data source integration successful');
    }, testTimeout);
  });
});