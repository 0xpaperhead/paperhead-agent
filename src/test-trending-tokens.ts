import { TrendingTokensService } from './services/trendingTokensService.js';

export async function testTrendingTokens() {
  console.log('🧪 Testing Trending Tokens Service...\n');
  
  const service = new TrendingTokensService();
  
  try {
    // Test 1: Fetch all trending tokens
    console.log('1️⃣ Fetching all trending tokens...');
    const allTokens = await service.fetchTrendingTokens();
    console.log(`✅ Found ${allTokens.length} trending tokens\n`);
    
    if (allTokens.length > 0) {
      const firstToken = allTokens[0];
      console.log(`📊 Sample token: ${firstToken.token.symbol} (${firstToken.token.name})`);
      console.log(`💰 Price: $${firstToken.pools[0]?.price.usd.toFixed(6) || 'N/A'}`);
      console.log(`📈 1h change: ${firstToken.events['1h']?.priceChangePercentage?.toFixed(2) || 'N/A'}%`);
      console.log(`⚠️ Risk score: ${firstToken.risk.score}/10\n`);
    }
    
    // Test 2: Get top momentum tokens
    console.log('2️⃣ Getting top momentum tokens (1h)...');
    const momentumTokens = await service.getTopMomentumTokens(5, '1h');
    console.log(`✅ Found ${momentumTokens.length} momentum tokens`);
    momentumTokens.forEach((token, index) => {
      const change = token.events['1h']?.priceChangePercentage || 0;
      console.log(`  ${index + 1}. ${token.token.symbol}: +${change.toFixed(2)}%`);
    });
    console.log();
    
    // Test 3: Get low-risk tokens
    console.log('3️⃣ Getting low-risk trending tokens...');
    const lowRiskTokens = await service.getLowRiskTrendingTokens(5);
    console.log(`✅ Found ${lowRiskTokens.length} low-risk tokens`);
    lowRiskTokens.forEach((token, index) => {
      const change = token.events['1h']?.priceChangePercentage || 0;
      console.log(`  ${index + 1}. ${token.token.symbol}: +${change.toFixed(2)}% (Risk: ${token.risk.score}/10)`);
    });
    console.log();
    
    // Test 4: Get market analysis
    console.log('4️⃣ Getting market analysis...');
    const analysis = await service.getMarketAnalysis();
    console.log(`✅ Market Analysis:`);
    console.log(`  📊 Total Tokens: ${analysis.totalTokens}`);
    console.log(`  🎯 Market Sentiment: ${analysis.marketSentiment.toUpperCase()}`);
    console.log(`  ⚠️ Average Risk: ${analysis.averageRiskScore.toFixed(1)}/10`);
    console.log(`  🔴 High Risk: ${analysis.riskDistribution.high} | 🟡 Medium: ${analysis.riskDistribution.medium} | 🟢 Low: ${analysis.riskDistribution.low}`);
    console.log();
    
    // Test 5: Analyze token opportunity
    if (allTokens.length > 0) {
      console.log('5️⃣ Analyzing token opportunity...');
      const tokenToAnalyze = allTokens[0];
      const opportunity = service.analyzeTokenOpportunity(tokenToAnalyze);
      console.log(`✅ Analysis for ${tokenToAnalyze.token.symbol}:`);
      console.log(`  📊 Score: ${opportunity.score}/100`);
      console.log(`  🎯 Recommendation: ${opportunity.recommendation.toUpperCase()}`);
      console.log(`  🟢 Signals: ${opportunity.signals.length > 0 ? opportunity.signals.join(', ') : 'None'}`);
      console.log(`  🔴 Risks: ${opportunity.risks.length > 0 ? opportunity.risks.join(', ') : 'None'}`);
    }
    
    console.log('\n🎉 All tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during testing:', error);
    
    // Check if it's an API key issue
    if (error instanceof Error && (error.message.includes('401') || error.message.includes('403'))) {
      console.log('\n💡 Make sure to set your SOLANA_TRACKER_API_KEY in your .env file');
      console.log('   Get your API key from: https://solanatracker.io/');
    }
  }
}