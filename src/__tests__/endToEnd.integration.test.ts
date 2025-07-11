import { AgenticSystem } from '../agent/agenticSystem.js';
import { Config } from '../libs/config.js';
import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { expectValidTokenMint, expectValidRiskScore, expectValidConfidenceScore } from './setup.js';

describe('End-to-End Integration Tests', () => {
  let agenticSystem: AgenticSystem;
  const testTimeout = 180000; // 3 minutes for full end-to-end tests

  beforeAll(async () => {
    console.log('🚀 Starting End-to-End Integration Tests');
    console.log('📊 This will test the complete agentic system flow with real APIs');
    
    agenticSystem = new AgenticSystem();
    await agenticSystem.initialize();
  }, testTimeout);

  afterAll(async () => {
    if (agenticSystem) {
      agenticSystem.stop();
    }
    console.log('✅ End-to-End Integration Tests Completed');
  });

  describe('Complete System Flow', () => {
    test('should perform full market analysis and decision making flow', async () => {
      console.log('🔍 Testing complete market analysis flow...');
      
      // This simulates what happens in the main loop
      const initialState = agenticSystem.getState();
      expect(initialState.currentTopics.length).toBeGreaterThan(0);
      
      // Generate portfolio (this triggers the full analysis)
      const portfolio = await agenticSystem.generatePortfolioNow('moderate', 5);
      
      // Verify the complete flow worked
      expect(portfolio.portfolio.tokens).toHaveLength(5);
      expect(portfolio.portfolio.metadata.basedOnData.totalTokensAnalyzed).toBeGreaterThan(0);
      expect(['bullish', 'bearish', 'neutral']).toContain(portfolio.portfolio.metadata.basedOnData.marketSentiment);
      
      // Verify all tokens have complete data
      portfolio.portfolio.tokens.forEach(token => {
        expectValidTokenMint(token.mint);
        expectValidRiskScore(token.riskScore);
        expectValidConfidenceScore(token.confidence);
        expect(token.reasoning).toBeDefined();
        expect(token.reasoning.length).toBeGreaterThan(10);
      });
      
      console.log('✅ Complete market analysis flow successful');
    }, testTimeout);

    test('should handle multiple portfolio generations with different risk profiles', async () => {
      console.log('🎯 Testing multiple portfolio generations...');
      
      const startTime = Date.now();
      
      // Generate different portfolios in sequence
      const conservative = await agenticSystem.generatePortfolioNow('conservative', 3);
      const moderate = await agenticSystem.generatePortfolioNow('moderate', 4);
      const aggressive = await agenticSystem.generatePortfolioNow('aggressive', 5);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      console.log(`⏱️  Total time for 3 portfolios: ${duration}ms`);
      
      // Verify all portfolios are valid
      expect(conservative.portfolio.tokens).toHaveLength(3);
      expect(moderate.portfolio.tokens).toHaveLength(4);
      expect(aggressive.portfolio.tokens).toHaveLength(5);
      
      // Verify different risk profiles
      expect(conservative.portfolio.metadata.riskProfile).toBe('conservative');
      expect(moderate.portfolio.metadata.riskProfile).toBe('moderate');
      expect(aggressive.portfolio.metadata.riskProfile).toBe('aggressive');
      
      // Conservative should generally have lower risk
      expect(conservative.analysis.averageRiskScore).toBeLessThanOrEqual(moderate.analysis.averageRiskScore + 1);
      
      console.log('✅ Multiple portfolio generations successful');
    }, testTimeout);

    test('should maintain data consistency across operations', async () => {
      console.log('🔄 Testing data consistency...');
      
      // Get initial state
      const initialState = agenticSystem.getState();
      const initialTopicsCount = initialState.currentTopics.length;
      
      // Generate a portfolio
      await agenticSystem.generatePortfolioNow('moderate', 3);
      
      // Check state after operation
      const finalState = agenticSystem.getState();
      
      // Data should be preserved or expanded, not lost
      expect(finalState.currentTopics.length).toBeGreaterThanOrEqual(initialTopicsCount);
      
      // Portfolio should be available
      const currentPortfolio = agenticSystem.getCurrentPortfolio();
      expect(currentPortfolio).not.toBeNull();
      expect(currentPortfolio!.portfolio.tokens).toHaveLength(3);
      
      console.log('✅ Data consistency maintained');
    }, testTimeout);

    test('should handle real-time market data updates', async () => {
      console.log('📊 Testing real-time market data handling...');
      
      // Get initial data
      const initialState = agenticSystem.getState();
      const initialTopicsCount = initialState.currentTopics.length;
      
      // Force a new data collection (simulating what happens in the main loop)
      await agenticSystem.initialize();
      
      // Check if data was updated
      const updatedState = agenticSystem.getState();
      
      // Should have collected fresh data
      expect(updatedState.currentTopics.length).toBeGreaterThan(0);
      
      // Verify data freshness (timestamps should be recent)
      updatedState.currentTopics.forEach(topic => {
        expect(topic.timestamp).toBeGreaterThan(Date.now() - 10 * 60 * 1000); // Within last 10 minutes
      });
      
      console.log('✅ Real-time market data handling successful');
    }, testTimeout);

    test('should provide actionable portfolio recommendations', async () => {
      console.log('💡 Testing portfolio recommendations...');
      
      const portfolio = await agenticSystem.generatePortfolioNow('moderate', 5);
      const analysis = portfolio.analysis;
      
      // Verify recommendations are actionable
      expect(['build', 'wait', 'adjust']).toContain(analysis.recommendedAction);
      
      // Should have meaningful analysis
      expect(analysis.strengths.length + analysis.warnings.length).toBeGreaterThan(0);
      
      // Market alignment should be calculated
      expect(analysis.marketAlignmentScore).toBeGreaterThan(0);
      
      // Diversification should be measured
      expect(analysis.diversificationScore).toBeGreaterThan(0);
      
      console.log(`📊 Portfolio recommendation: ${analysis.recommendedAction.toUpperCase()}`);
      console.log(`🎯 Market alignment: ${analysis.marketAlignmentScore}/100`);
      console.log(`🔄 Diversification: ${analysis.diversificationScore}/100`);
      
      if (analysis.strengths.length > 0) {
        console.log('✅ Strengths:', analysis.strengths.slice(0, 2).join(', '));
      }
      
      if (analysis.warnings.length > 0) {
        console.log('⚠️  Warnings:', analysis.warnings.slice(0, 2).join(', '));
      }
      
      console.log('✅ Portfolio recommendations are actionable');
    }, testTimeout);

    test('should handle API rate limits gracefully', async () => {
      console.log('🚦 Testing API rate limit handling...');
      
      // Perform multiple operations quickly to test rate limiting
      const promises = [];
      for (let i = 0; i < 3; i++) {
        promises.push(agenticSystem.generatePortfolioNow('moderate', 2));
      }
      
      // All should complete without errors
      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(3);
      results.forEach((result, index) => {
        expect(result.portfolio.tokens).toHaveLength(2);
        expect(result.portfolio.id).toBeDefined();
      });
      
      console.log('✅ API rate limit handling successful');
    }, testTimeout);

    test('should work with current Solana ecosystem', async () => {
      console.log('🌐 Testing Solana ecosystem integration...');
      
      const portfolio = await agenticSystem.generatePortfolioNow('moderate', 5);
      
      // Verify we're getting real Solana tokens
      const tokenSymbols = portfolio.portfolio.tokens.map(t => t.symbol);
      console.log('🪙 Selected tokens:', tokenSymbols.join(', '));
      
      // Should have valid Solana addresses
      portfolio.portfolio.tokens.forEach(token => {
        expectValidTokenMint(token.mint);
        expect(token.symbol).toBeDefined();
        expect(token.name).toBeDefined();
      });
      
      // Portfolio should reflect current market data
      expect(portfolio.portfolio.metadata.basedOnData.totalTokensAnalyzed).toBeGreaterThan(50);
      
      console.log('✅ Solana ecosystem integration successful');
    }, testTimeout);

    test('should demonstrate complete autonomous decision making', async () => {
      console.log('🤖 Testing autonomous decision making...');
      
      // Get system state before
      const beforeState = agenticSystem.getState();
      
      // Generate portfolio (this involves the complete decision making process)
      const portfolio = await agenticSystem.generatePortfolioNow('moderate', 4);
      
      // Get system state after
      const afterState = agenticSystem.getState();
      
      // Verify the AI made decisions
      expect(portfolio.portfolio.tokens).toHaveLength(4);
      
      // Each token should have AI-generated reasoning
      portfolio.portfolio.tokens.forEach(token => {
        expect(token.reasoning).toBeDefined();
        expect(token.reasoning.length).toBeGreaterThan(20);
        expect(token.confidence).toBeGreaterThan(0);
      });
      
      // The system should have processed data
      expect(afterState.currentTopics.length).toBeGreaterThan(0);
      
      console.log('🎯 Portfolio Analysis:');
      console.log(`   Risk Profile: ${portfolio.portfolio.metadata.riskProfile}`);
      console.log(`   Market Sentiment: ${portfolio.portfolio.metadata.basedOnData.marketSentiment}`);
      console.log(`   Fear & Greed: ${portfolio.portfolio.metadata.basedOnData.fearGreedValue}`);
      console.log(`   Tokens Analyzed: ${portfolio.portfolio.metadata.basedOnData.totalTokensAnalyzed}`);
      
      console.log('✅ Autonomous decision making successful');
    }, testTimeout);
  });

  describe('Performance and Reliability', () => {
    test('should complete full analysis within reasonable time', async () => {
      console.log('⏱️  Testing performance...');
      
      const startTime = Date.now();
      
      await agenticSystem.generatePortfolioNow('moderate', 5);
      
      const duration = Date.now() - startTime;
      console.log(`📊 Portfolio generation time: ${duration}ms`);
      
      // Should complete within 90 seconds
      expect(duration).toBeLessThan(90000);
      
      console.log('✅ Performance test passed');
    }, testTimeout);

    test('should handle multiple concurrent operations', async () => {
      console.log('🔄 Testing concurrent operations...');
      
      const startTime = Date.now();
      
      // Run multiple operations concurrently
      const [portfolio1, portfolio2] = await Promise.all([
        agenticSystem.generatePortfolioNow('conservative', 3),
        agenticSystem.generatePortfolioNow('aggressive', 3)
      ]);
      
      const duration = Date.now() - startTime;
      console.log(`📊 Concurrent operations time: ${duration}ms`);
      
      // Both should succeed
      expect(portfolio1.portfolio.tokens).toHaveLength(3);
      expect(portfolio2.portfolio.tokens).toHaveLength(3);
      
      // Should have different risk profiles
      expect(portfolio1.portfolio.metadata.riskProfile).toBe('conservative');
      expect(portfolio2.portfolio.metadata.riskProfile).toBe('aggressive');
      
      console.log('✅ Concurrent operations successful');
    }, testTimeout);

    test('should maintain state consistency under load', async () => {
      console.log('🔧 Testing state consistency under load...');
      
      // Perform multiple operations
      const operations = [];
      for (let i = 0; i < 5; i++) {
        operations.push(agenticSystem.generatePortfolioNow('moderate', 2));
      }
      
      const results = await Promise.all(operations);
      
      // All should succeed
      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result.portfolio.tokens).toHaveLength(2);
      });
      
      // Final state should be consistent
      const finalState = agenticSystem.getState();
      expect(finalState.currentTopics.length).toBeGreaterThan(0);
      
      const currentPortfolio = agenticSystem.getCurrentPortfolio();
      expect(currentPortfolio).not.toBeNull();
      
      console.log('✅ State consistency under load maintained');
    }, testTimeout);
  });
});