import { AgenticSystem } from '../agent/agenticSystem.js';
import { Config } from '../libs/config.js';
import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { isValidSolanaAddress } from './setup.js';

describe('AgenticSystem Integration Tests', () => {
  let agenticSystem: AgenticSystem;
  const testTimeout = 120000; // 2 minutes for real API calls

  beforeAll(async () => {
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
    if (!Config.agent.solana_rpc_url) {
      throw new Error('SOLANA_RPC_URL environment variable is required for integration tests');
    }
    if (!Config.agent.solana_private_key) {
      throw new Error('SOLANA_PRIVATE_KEY environment variable is required for integration tests');
    }

    agenticSystem = new AgenticSystem();
  }, testTimeout);

  afterAll(async () => {
    if (agenticSystem) {
      agenticSystem.stop();
    }
  });

  describe('System Initialization', () => {
    test('should initialize blockchain connection and tools', async () => {
      await expect(agenticSystem.initialize()).resolves.not.toThrow();
      
      // Verify system state after initialization
      const state = agenticSystem.getState();
      expect(state.isRunning).toBe(false);
      // After initialization, we should have some data from real APIs
      expect(Array.isArray(state.currentTopics)).toBe(true);
      expect(Array.isArray(state.sentimentHistory)).toBe(true);
      expect(Array.isArray(state.trendAnalysis)).toBe(true);
    }, testTimeout);

    test('should have no initial portfolio before generation', () => {
      // Create a new system to test initial state
      const newSystem = new AgenticSystem();
      const portfolio = newSystem.getCurrentPortfolio();
      expect(portfolio).toBeNull();
      
      const lastUpdate = newSystem.getLastPortfolioUpdate();
      expect(lastUpdate).toBe(0);
    });
  });

  describe('Portfolio Generation', () => {
    test('should generate conservative portfolio with real data', async () => {
      const portfolio = await agenticSystem.generatePortfolioNow('conservative', 3);
      
      // Verify portfolio structure
      expect(portfolio).toBeDefined();
      expect(portfolio.portfolio).toBeDefined();
      expect(portfolio.analysis).toBeDefined();
      
      // Verify portfolio properties
      expect(portfolio.portfolio.tokens).toHaveLength(3);
      expect(portfolio.portfolio.totalAllocation).toBe(100);
      expect(portfolio.portfolio.metadata.riskProfile).toBe('conservative');
      expect(portfolio.portfolio.metadata.strategy).toBe('equal_weight');
      
      // Verify token allocations
      portfolio.portfolio.tokens.forEach(token => {
        expect(token.allocation).toBeCloseTo(33.33, 1);
        expect(token.riskScore).toBeLessThanOrEqual(10);
        expect(token.confidence).toBeGreaterThanOrEqual(0);
        expect(token.momentumScore).toBeGreaterThanOrEqual(0);
        expect(token.sentimentScore).toBeGreaterThanOrEqual(0);
      });
      
      // Verify analysis
      expect(portfolio.analysis.averageRiskScore).toBeGreaterThanOrEqual(0);
      expect(portfolio.analysis.averageMomentumScore).toBeGreaterThanOrEqual(0);
      expect(portfolio.analysis.averageSentimentScore).toBeGreaterThanOrEqual(0);
      expect(portfolio.analysis.diversificationScore).toBeGreaterThanOrEqual(0);
      expect(portfolio.analysis.marketAlignmentScore).toBeGreaterThanOrEqual(0);
      expect(['build', 'wait', 'adjust']).toContain(portfolio.analysis.recommendedAction);
    }, testTimeout);

    test('should generate moderate portfolio with real data', async () => {
      const portfolio = await agenticSystem.generatePortfolioNow('moderate', 5);
      
      expect(portfolio.portfolio.tokens).toHaveLength(5);
      expect(portfolio.portfolio.metadata.riskProfile).toBe('moderate');
      
      // Verify equal allocation
      portfolio.portfolio.tokens.forEach(token => {
        expect(token.allocation).toBeCloseTo(20, 1);
      });
      
      // Moderate portfolio should allow higher risk than conservative
      const avgRisk = portfolio.analysis.averageRiskScore;
      expect(avgRisk).toBeGreaterThanOrEqual(0);
      expect(avgRisk).toBeLessThanOrEqual(10);
    }, testTimeout);

    test('should generate aggressive portfolio with real data', async () => {
      const portfolio = await agenticSystem.generatePortfolioNow('aggressive', 4);
      
      expect(portfolio.portfolio.tokens).toHaveLength(4);
      expect(portfolio.portfolio.metadata.riskProfile).toBe('aggressive');
      
      // Verify equal allocation
      portfolio.portfolio.tokens.forEach(token => {
        expect(token.allocation).toBeCloseTo(25, 1);
      });
    }, testTimeout);

    test('should update current portfolio after generation', async () => {
      const beforeUpdate = agenticSystem.getLastPortfolioUpdate();
      
      await agenticSystem.generatePortfolioNow('moderate', 5);
      
      const afterUpdate = agenticSystem.getLastPortfolioUpdate();
      const currentPortfolio = agenticSystem.getCurrentPortfolio();
      
      expect(afterUpdate).toBeGreaterThan(beforeUpdate);
      expect(currentPortfolio).not.toBeNull();
      expect(currentPortfolio!.portfolio.tokens).toHaveLength(5);
    }, testTimeout);
  });

  describe('Market Data Integration', () => {
    test('should fetch and process real market data', async () => {
      // Initialize the system to trigger data collection
      await agenticSystem.initialize();
      
      // Get the state after initialization
      const state = agenticSystem.getState();
      
      // The system should have collected initial data (may be empty if APIs are down)
      expect(Array.isArray(state.currentTopics)).toBe(true);
      
      // Verify topic score structure
      state.currentTopics.forEach(topicScore => {
        expect(topicScore.topic).toBeDefined();
        expect(typeof topicScore.popularityScore).toBe('number');
        expect(topicScore.popularityScore).toBeGreaterThanOrEqual(0);
        expect(topicScore.popularityScore).toBeLessThanOrEqual(100);
        expect(Array.isArray(topicScore.articles)).toBe(true);
        expect(typeof topicScore.timestamp).toBe('number');
      });
      
      // Verify article structure (if any articles exist)
      const topicWithArticles = state.currentTopics.find(t => t.articles.length > 0);
      if (topicWithArticles) {
        const article = topicWithArticles.articles[0];
        expect(article.title).toBeDefined();
        expect(article.sentiment).toBeDefined();
        expect(['positive', 'negative', 'neutral']).toContain(article.sentiment.label);
        expect(typeof article.sentiment.score).toBe('number');
      }
    }, testTimeout);

    test('should handle API errors gracefully', async () => {
      // This test will run with real APIs, so we expect it to succeed unless APIs are down
      await expect(agenticSystem.initialize()).resolves.not.toThrow();
    }, testTimeout);
  });

  describe('System State Management', () => {
    test('should maintain proper state through operations', async () => {
      const initialState = agenticSystem.getState();
      expect(initialState.isRunning).toBe(false);
      
      // Generate a portfolio which should update state
      await agenticSystem.generatePortfolioNow('moderate', 3);
      
      const updatedState = agenticSystem.getState();
      expect(updatedState.isRunning).toBe(false); // Should still be false since we haven't started the loop
    }, testTimeout);

    test('should provide valid system state structure', () => {
      const state = agenticSystem.getState();
      
      expect(typeof state.isRunning).toBe('boolean');
      expect(typeof state.lastUpdate).toBe('number');
      expect(Array.isArray(state.currentTopics)).toBe(true);
      expect(Array.isArray(state.sentimentHistory)).toBe(true);
      expect(Array.isArray(state.trendAnalysis)).toBe(true);
    });
  });

  describe('Error Handling and Resilience', () => {
    test('should handle portfolio generation with insufficient data', async () => {
      // Even with real APIs, the system should handle cases where data is limited
      const portfolio = await agenticSystem.generatePortfolioNow('conservative', 1);
      
      expect(portfolio.portfolio.tokens).toHaveLength(1);
      expect(portfolio.portfolio.tokens[0].allocation).toBe(100);
    }, testTimeout);

    test('should validate portfolio constraints', async () => {
      const portfolio = await agenticSystem.generatePortfolioNow('moderate', 5);
      
      // Verify total allocation is exactly 100%
      const totalAllocation = portfolio.portfolio.tokens.reduce((sum, token) => sum + token.allocation, 0);
      expect(totalAllocation).toBeCloseTo(100, 1);
      
      // Verify all tokens have valid properties
      portfolio.portfolio.tokens.forEach(token => {
        expect(token.symbol).toBeDefined();
        expect(token.mint).toBeDefined();
        expect(token.name).toBeDefined();
        expect(token.reasoning).toBeDefined();
        expect(token.allocation).toBeGreaterThan(0);
        expect(token.riskScore).toBeGreaterThanOrEqual(0);
        expect(token.riskScore).toBeLessThanOrEqual(10);
        expect(token.confidence).toBeGreaterThanOrEqual(0);
        expect(token.confidence).toBeLessThanOrEqual(100);
      });
    }, testTimeout);
  });

  describe('Real-World Data Validation', () => {
    test('should work with current Solana ecosystem data', async () => {
      await agenticSystem.initialize();
      
      const portfolio = await agenticSystem.generatePortfolioNow('moderate', 5);
      
      // Verify we're getting real Solana tokens
      portfolio.portfolio.tokens.forEach(token => {
        expect(isValidSolanaAddress(token.mint)).toBe(true);
        expect(token.symbol).toBeDefined();
        expect(token.name).toBeDefined();
      });
      
      // Verify the portfolio metadata reflects real market conditions
      expect(portfolio.portfolio.metadata.basedOnData.totalTokensAnalyzed).toBeGreaterThan(0);
      expect(['bullish', 'bearish', 'neutral']).toContain(portfolio.portfolio.metadata.basedOnData.marketSentiment);
    }, testTimeout);

    test('should generate different portfolios over time', async () => {
      const portfolio1 = await agenticSystem.generatePortfolioNow('moderate', 3);
      
      // Wait a small amount to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const portfolio2 = await agenticSystem.generatePortfolioNow('moderate', 3);
      
      expect(portfolio1.portfolio.id).not.toBe(portfolio2.portfolio.id);
      expect(portfolio1.portfolio.metadata.createdAt).toBeLessThan(portfolio2.portfolio.metadata.createdAt);
    }, testTimeout);
  });

  describe('Performance and Scalability', () => {
    test('should complete portfolio generation within reasonable time', async () => {
      const startTime = Date.now();
      
      await agenticSystem.generatePortfolioNow('moderate', 5);
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(60000); // Should complete within 1 minute
    }, testTimeout);

    test('should handle multiple portfolio generations', async () => {
      const portfolios = await Promise.all([
        agenticSystem.generatePortfolioNow('conservative', 3),
        agenticSystem.generatePortfolioNow('moderate', 3),
        agenticSystem.generatePortfolioNow('aggressive', 3)
      ]);
      
      expect(portfolios).toHaveLength(3);
      expect(portfolios[0].portfolio.metadata.riskProfile).toBe('conservative');
      expect(portfolios[1].portfolio.metadata.riskProfile).toBe('moderate');
      expect(portfolios[2].portfolio.metadata.riskProfile).toBe('aggressive');
    }, testTimeout);
  });
});