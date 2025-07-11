import { AgenticSystem } from '../agent/agenticSystem.js';

async function runFullSystemDemo() {
  console.log('🚀 Starting Full System Demo');
  console.log('📊 This will demonstrate the complete autonomous trading system');
  console.log('💰 24-Hour Automatic Portfolio Rebalancing System');
  console.log('🎯 10-Token Diversified Portfolio Strategy');
  console.log('⏰ Expected duration: 3-5 minutes');
  console.log('🔍 Using live market data and real APIs\n');

  let agenticSystem: AgenticSystem | undefined;

  try {
    const startTime = Date.now();
    console.log('🎯 PHASE 1: System Initialization');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // Initialize the system
    agenticSystem = new AgenticSystem();
    await agenticSystem.initialize();
    console.log('✅ System initialized successfully');
    
    // Show system state
    const initialState = agenticSystem.getState();
    console.log(`📈 Initial data collected: ${initialState.currentTopics.length} topics analyzed`);
    console.log(`📊 Sentiment history: ${initialState.sentimentHistory.length} entries`);
    console.log(`📉 Trend analysis: ${initialState.trendAnalysis.length} trends identified`);
    
    console.log('\n🎯 PHASE 2: Portfolio Generation - Conservative Profile (3 tokens)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // Generate conservative portfolio
    const conservativePortfolio = await agenticSystem.generatePortfolioNow('conservative', 3);
    
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
    
    console.log('\n🎯 PHASE 3: Portfolio Generation - Moderate Profile (5 tokens)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // Generate moderate portfolio
    const moderatePortfolio = await agenticSystem.generatePortfolioNow('moderate', 5);
    
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
    });
    
    console.log('\n🎯 PHASE 4: Portfolio Generation - Aggressive Profile (10 tokens)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // Generate aggressive portfolio
    const aggressivePortfolio = await agenticSystem.generatePortfolioNow('aggressive', 10);
    
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
    
    console.log('\n🎯 PHASE 6: Performance Metrics');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // Calculate performance metrics
    const totalDuration = Date.now() - startTime;
    console.log(`⏱️  Total Duration: ${Math.round(totalDuration / 1000)} seconds`);
    console.log(`📊 Portfolios Generated: 3 (Conservative: 3 tokens, Moderate: 5 tokens, Aggressive: 10 tokens)`);
    console.log(`💰 Total Tokens Analyzed: ${conservativePortfolio.portfolio.metadata.basedOnData.totalTokensAnalyzed}`);
    console.log(`😱 Fear & Greed Index: ${conservativePortfolio.portfolio.metadata.basedOnData.fearGreedValue}`);
    console.log(`📈 Trending Topics: ${conservativePortfolio.portfolio.metadata.basedOnData.topTrendingTopics.length}`);
    
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
    
    console.log('\n✅ FULL SYSTEM DEMO COMPLETED!');
    console.log('════════════════════════════════════════════════════════════════════════════════════');
    console.log('🎯 All phases completed successfully');
    console.log('📊 3 portfolios generated with real market data (18 total tokens)');
    console.log('🌐 System ready for autonomous trading');
    console.log('════════════════════════════════════════════════════════════════════════════════════');
    
    // Clean up
    if (agenticSystem) {
      agenticSystem.stop();
    }
    
    console.log('\n🎉 Demo completed successfully!');
    console.log('💡 Run with: npx ts-node src/scripts/fullSystemTest.ts');
    
  } catch (error) {
    console.error('\n❌ DEMO FAILED!');
    console.error('════════════════════════════════════════════════════════════════════════════════════');
    console.error('Error:', error);
    console.error('════════════════════════════════════════════════════════════════════════════════════');
    
    // Clean up on error
    if (agenticSystem) {
      agenticSystem.stop();
    }
    
    process.exit(1);
  }
}

// Run the demo if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runFullSystemDemo().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { runFullSystemDemo };