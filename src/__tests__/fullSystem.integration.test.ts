import { AgenticSystem } from '../agent/agenticSystem.js';
import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { isValidSolanaAddress } from './setup.js';

describe('Full System Integration Test', () => {
  let agenticSystem: AgenticSystem;
  const testTimeout = 300000; // 5 minutes for complete system run

  beforeAll(async () => {
    console.log('🚀 Starting Full System Integration Test');
    console.log('📊 This test will run the complete autonomous trading system');
    console.log('⏰ Expected duration: 3-5 minutes');
    console.log('🔍 Testing with live market data and real APIs\n');
    
    agenticSystem = new AgenticSystem();
  }, testTimeout);

  afterAll(async () => {
    if (agenticSystem) {
      agenticSystem.stop();
    }
    console.log('\n✅ Full System Integration Test Completed');
  });

  test('should run complete autonomous trading system and generate portfolio', async () => {
    const startTime = Date.now();
    console.log('🎯 PHASE 1: System Initialization');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // Initialize the system
    await agenticSystem.initialize();
    console.log('✅ System initialized successfully');
    
    // Verify system state
    const initialState = agenticSystem.getState();
    expect(initialState.isRunning).toBe(false);
    expect(Array.isArray(initialState.currentTopics)).toBe(true);
    expect(Array.isArray(initialState.sentimentHistory)).toBe(true);
    expect(Array.isArray(initialState.trendAnalysis)).toBe(true);
    
    console.log(`📈 Initial data collected: ${initialState.currentTopics.length} topics analyzed`);
    console.log(`📊 Sentiment history: ${initialState.sentimentHistory.length} entries`);
    console.log(`📉 Trend analysis: ${initialState.trendAnalysis.length} trends identified`);
    
    console.log('\n🎯 PHASE 2: Portfolio Generation - Conservative Profile');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // Generate conservative portfolio
    const conservativePortfolio = await agenticSystem.generatePortfolioNow('conservative', 3);
    
    // Validate portfolio structure
    expect(conservativePortfolio).toBeDefined();
    expect(conservativePortfolio.portfolio).toBeDefined();
    expect(conservativePortfolio.analysis).toBeDefined();
    expect(conservativePortfolio.portfolio.tokens).toHaveLength(3);
    expect(conservativePortfolio.portfolio.totalAllocation).toBe(100);
    
    console.log('\n📋 CONSERVATIVE PORTFOLIO DETAILS:');
    console.log('════════════════════════════════════════════════════════════════════════════════════');
    console.log(`📊 Portfolio ID: ${conservativePortfolio.portfolio.id}`);
    console.log(`🎯 Risk Profile: ${conservativePortfolio.portfolio.metadata.riskProfile}`);
    console.log(`📈 Strategy: ${conservativePortfolio.portfolio.metadata.strategy}`);
    console.log(`💰 Total Allocation: ${conservativePortfolio.portfolio.totalAllocation}%`);
    console.log(`⏰ Created: ${new Date(conservativePortfolio.portfolio.metadata.createdAt).toLocaleString()}`);
    console.log(`🌐 Market Sentiment: ${conservativePortfolio.portfolio.metadata.basedOnData.marketSentiment}`);
    console.log(`🔍 Tokens Analyzed: ${conservativePortfolio.portfolio.metadata.basedOnData.totalTokensAnalyzed}`);
    console.log(`😱 Fear & Greed Index: ${conservativePortfolio.portfolio.metadata.basedOnData.fearGreedValue}`);
    console.log(`📈 Top Trending Topics: ${conservativePortfolio.portfolio.metadata.basedOnData.topTrendingTopics.join(', ')}`);
    
    console.log('\n🪙 SELECTED TOKENS:');
    console.log('────────────────────────────────────────────────────────────────────────────────────');
    conservativePortfolio.portfolio.tokens.forEach((token, index) => {
      console.log(`${index + 1}. ${token.name} (${token.symbol})`);
      console.log(`   📍 Mint: ${token.mint}`);
      console.log(`   💰 Allocation: ${token.allocation}%`);
      console.log(`   📈 Confidence: ${token.confidence}%`);
      console.log(`   ⚠️  Risk Score: ${token.riskScore}/10`);
      console.log(`   🚀 Momentum: ${token.momentumScore}/100`);
      console.log(`   😊 Sentiment: ${token.sentimentScore}/100`);
      console.log(`   💭 Reasoning: ${token.reasoning}`);
      console.log('');
      
      // Validate token data
      expect(isValidSolanaAddress(token.mint)).toBe(true);
      expect(token.allocation).toBeCloseTo(33.33, 1);
      expect(token.confidence).toBeGreaterThanOrEqual(0);
      expect(token.confidence).toBeLessThanOrEqual(100);
      expect(token.riskScore).toBeGreaterThanOrEqual(0);
      expect(token.riskScore).toBeLessThanOrEqual(10);
    });
    
    console.log('📊 PORTFOLIO ANALYSIS:');
    console.log('────────────────────────────────────────────────────────────────────────────────────');
    console.log(`📈 Average Momentum: ${conservativePortfolio.analysis.averageMomentumScore}/100`);
    console.log(`😊 Average Sentiment: ${conservativePortfolio.analysis.averageSentimentScore}/100`);
    console.log(`⚠️  Average Risk: ${conservativePortfolio.analysis.averageRiskScore}/10`);
    console.log(`🎯 Diversification: ${conservativePortfolio.analysis.diversificationScore}/100`);
    console.log(`🌐 Market Alignment: ${conservativePortfolio.analysis.marketAlignmentScore}/100`);
    console.log(`💡 Recommended Action: ${conservativePortfolio.analysis.recommendedAction}`);
    
    console.log('\n✅ PORTFOLIO STRENGTHS:');
    conservativePortfolio.analysis.strengths.forEach((strength, index) => {
      console.log(`   ${index + 1}. ${strength}`);
    });
    
    if (conservativePortfolio.analysis.warnings.length > 0) {
      console.log('\n⚠️  PORTFOLIO WARNINGS:');
      conservativePortfolio.analysis.warnings.forEach((warning, index) => {
        console.log(`   ${index + 1}. ${warning}`);
      });
    }
    
    console.log('\n🎯 PHASE 3: Portfolio Generation - Moderate Profile');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // Generate moderate portfolio
    const moderatePortfolio = await agenticSystem.generatePortfolioNow('moderate', 5);
    
    // Validate portfolio structure
    expect(moderatePortfolio.portfolio.tokens).toHaveLength(5);
    expect(moderatePortfolio.portfolio.metadata.riskProfile).toBe('moderate');
    
    console.log('\n📋 MODERATE PORTFOLIO DETAILS:');
    console.log('════════════════════════════════════════════════════════════════════════════════════');
    console.log(`📊 Portfolio ID: ${moderatePortfolio.portfolio.id}`);
    console.log(`🎯 Risk Profile: ${moderatePortfolio.portfolio.metadata.riskProfile}`);
    console.log(`💰 Total Allocation: ${moderatePortfolio.portfolio.totalAllocation}%`);
    console.log(`⏰ Created: ${new Date(moderatePortfolio.portfolio.metadata.createdAt).toLocaleString()}`);
    
    console.log('\n🪙 SELECTED TOKENS:');
    console.log('────────────────────────────────────────────────────────────────────────────────────');
    moderatePortfolio.portfolio.tokens.forEach((token, index) => {
      console.log(`${index + 1}. ${token.name} (${token.symbol}) - ${token.allocation}% allocation`);
      console.log(`   📍 Mint: ${token.mint}`);
      console.log(`   📈 Confidence: ${token.confidence}% | Risk: ${token.riskScore}/10 | Momentum: ${token.momentumScore}/100`);
      console.log(`   💭 ${token.reasoning}`);
      console.log('');
      
      // Validate token data
      expect(isValidSolanaAddress(token.mint)).toBe(true);
      expect(token.allocation).toBeCloseTo(20, 1);
    });
    
    console.log('\n🎯 PHASE 4: Portfolio Generation - Aggressive Profile');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // Generate aggressive portfolio
    const aggressivePortfolio = await agenticSystem.generatePortfolioNow('aggressive', 4);
    
    // Validate portfolio structure
    expect(aggressivePortfolio.portfolio.tokens).toHaveLength(4);
    expect(aggressivePortfolio.portfolio.metadata.riskProfile).toBe('aggressive');
    
    console.log('\n📋 AGGRESSIVE PORTFOLIO DETAILS:');
    console.log('════════════════════════════════════════════════════════════════════════════════════');
    console.log(`📊 Portfolio ID: ${aggressivePortfolio.portfolio.id}`);
    console.log(`🎯 Risk Profile: ${aggressivePortfolio.portfolio.metadata.riskProfile}`);
    console.log(`💰 Total Allocation: ${aggressivePortfolio.portfolio.totalAllocation}%`);
    console.log(`⏰ Created: ${new Date(aggressivePortfolio.portfolio.metadata.createdAt).toLocaleString()}`);
    
    console.log('\n🪙 SELECTED TOKENS:');
    console.log('────────────────────────────────────────────────────────────────────────────────────');
    aggressivePortfolio.portfolio.tokens.forEach((token, index) => {
      console.log(`${index + 1}. ${token.name} (${token.symbol}) - ${token.allocation}% allocation`);
      console.log(`   📍 Mint: ${token.mint}`);
      console.log(`   📈 Confidence: ${token.confidence}% | Risk: ${token.riskScore}/10 | Momentum: ${token.momentumScore}/100`);
      console.log(`   💭 ${token.reasoning}`);
      console.log('');
      
      // Validate token data
      expect(isValidSolanaAddress(token.mint)).toBe(true);
      expect(token.allocation).toBeCloseTo(25, 1);
    });
    
    console.log('\n🎯 PHASE 5: System State Analysis');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // Get final system state
    const finalState = agenticSystem.getState();
    const currentPortfolio = agenticSystem.getCurrentPortfolio();
    const lastUpdate = agenticSystem.getLastPortfolioUpdate();
    
    console.log('📊 FINAL SYSTEM STATE:');
    console.log('────────────────────────────────────────────────────────────────────────────────────');
    console.log(`🔄 System Running: ${finalState.isRunning}`);
    console.log(`📈 Topics Tracked: ${finalState.currentTopics.length}`);
    console.log(`📊 Sentiment History: ${finalState.sentimentHistory.length} entries`);
    console.log(`📉 Trend Analysis: ${finalState.trendAnalysis.length} trends`);
    console.log(`⏰ Last Update: ${new Date(finalState.lastUpdate).toLocaleString()}`);
    console.log(`💼 Current Portfolio: ${currentPortfolio ? currentPortfolio.portfolio.id : 'None'}`);
    console.log(`🕐 Last Portfolio Update: ${new Date(lastUpdate).toLocaleString()}`);
    
    // Validate final state
    expect(currentPortfolio).not.toBeNull();
    expect(currentPortfolio!.portfolio.metadata.riskProfile).toBe('aggressive'); // Should be the last one generated
    expect(lastUpdate).toBeGreaterThan(0);
    
    console.log('\n🎯 PHASE 6: Performance Metrics');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // Calculate performance metrics
    const totalDuration = Date.now() - startTime;
    console.log(`⏱️  Total Test Duration: ${Math.round(totalDuration / 1000)} seconds`);
    console.log(`📊 Portfolios Generated: 3 (Conservative, Moderate, Aggressive)`);
    console.log(`🎯 Success Rate: 100% (All portfolios generated successfully)`);
    console.log(`💰 Total Tokens Analyzed: ${conservativePortfolio.portfolio.metadata.basedOnData.totalTokensAnalyzed}`);
    console.log(`😱 Fear & Greed Index: ${conservativePortfolio.portfolio.metadata.basedOnData.fearGreedValue}`);
    console.log(`📈 Trending Topics: ${conservativePortfolio.portfolio.metadata.basedOnData.topTrendingTopics.length}`);
    
    // Performance validations
    expect(totalDuration).toBeLessThan(300000); // Should complete within 5 minutes
    
    console.log('\n🎯 PHASE 7: Portfolio Comparison');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    console.log('📊 RISK PROFILE COMPARISON:');
    console.log('────────────────────────────────────────────────────────────────────────────────────');
    console.log(`Conservative - Avg Risk: ${conservativePortfolio.analysis.averageRiskScore}/10, Avg Momentum: ${conservativePortfolio.analysis.averageMomentumScore}/100`);
    console.log(`Moderate     - Avg Risk: ${moderatePortfolio.analysis.averageRiskScore}/10, Avg Momentum: ${moderatePortfolio.analysis.averageMomentumScore}/100`);
    console.log(`Aggressive   - Avg Risk: ${aggressivePortfolio.analysis.averageRiskScore}/10, Avg Momentum: ${aggressivePortfolio.analysis.averageMomentumScore}/100`);
    
    console.log('\n🎯 RECOMMENDED ACTIONS:');
    console.log('────────────────────────────────────────────────────────────────────────────────────');
    console.log(`Conservative: ${conservativePortfolio.analysis.recommendedAction}`);
    console.log(`Moderate: ${moderatePortfolio.analysis.recommendedAction}`);
    console.log(`Aggressive: ${aggressivePortfolio.analysis.recommendedAction}`);
    
    // Validate risk progression
    expect(conservativePortfolio.analysis.averageRiskScore).toBeLessThanOrEqual(moderatePortfolio.analysis.averageRiskScore);
    expect(moderatePortfolio.analysis.averageRiskScore).toBeLessThanOrEqual(aggressivePortfolio.analysis.averageRiskScore);
    
    console.log('\n✅ FULL SYSTEM TEST COMPLETED SUCCESSFULLY!');
    console.log('════════════════════════════════════════════════════════════════════════════════════');
    console.log('🎯 All phases completed successfully');
    console.log('📊 3 portfolios generated with real market data');
    console.log('🔍 All validations passed');
    console.log('⚡ Performance requirements met');
    console.log('🌐 System ready for autonomous trading');
    console.log('════════════════════════════════════════════════════════════════════════════════════');
    
  }, testTimeout);
});