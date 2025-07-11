import { AgenticSystem } from '../agent/agenticSystem.js';
import { PortfolioService } from '../services/portfolioService.js';
import { TrendingTokensService } from '../services/trendingTokensService.js';
import { TrendAnalyzer } from '../services/trendAnalyzer.js';

export async function testPortfolioSystem() {
  console.log("🎯".repeat(30));
  console.log("🎯 TESTING AI-POWERED PORTFOLIO SYSTEM");
  console.log("🎯".repeat(30));

  try {
    // Check if API key is configured
    if (!process.env.SOLANA_TRACKER_API_KEY) {
      console.error("❌ Error: SOLANA_TRACKER_API_KEY environment variable not set");
      console.log("Please add your API key to .env file:");
      console.log("SOLANA_TRACKER_API_KEY=your_api_key_here");
      console.log("\nGet your API key from: https://docs.solanatracker.io/");
      return;
    }

    // Initialize services
    const trendingTokensService = new TrendingTokensService();
    const trendAnalyzer = new TrendAnalyzer();
    const portfolioService = new PortfolioService(trendingTokensService, trendAnalyzer);

    console.log("\n📊 Testing Direct Portfolio Service...");
    console.log("=".repeat(50));

    // Test 1: Conservative Portfolio
    console.log("\n1️⃣ TESTING CONSERVATIVE PORTFOLIO");
    try {
      const conservativePortfolio = await portfolioService.generateEqualAllocationPortfolio(4, 'conservative');
      console.log(`✅ Conservative Portfolio Generated:`);
      console.log(`   📝 Name: ${conservativePortfolio.portfolio.name}`);
      console.log(`   🎯 Strategy: ${conservativePortfolio.portfolio.metadata.strategy}`);
      console.log(`   ⚠️ Risk Profile: ${conservativePortfolio.portfolio.metadata.riskProfile}`);
      console.log(`   🪙 Tokens: ${conservativePortfolio.portfolio.tokens.length}`);
      console.log(`   📊 Market Alignment: ${conservativePortfolio.analysis.marketAlignmentScore}/100`);
      
      conservativePortfolio.portfolio.tokens.forEach((token, index) => {
        console.log(`   ${index + 1}. ${token.symbol} (${token.allocation.toFixed(1)}%) - Risk: ${token.riskScore}/10`);
      });
    } catch (error: any) {
      console.error(`❌ Conservative portfolio failed:`, error.message);
    }

    // Test 2: Moderate Portfolio
    console.log("\n2️⃣ TESTING MODERATE PORTFOLIO");
    try {
      const moderatePortfolio = await portfolioService.generateEqualAllocationPortfolio(5, 'moderate');
      console.log(`✅ Moderate Portfolio Generated:`);
      console.log(`   📝 Name: ${moderatePortfolio.portfolio.name}`);
      console.log(`   🎯 Strategy: ${moderatePortfolio.portfolio.metadata.strategy}`);
      console.log(`   ⚠️ Risk Profile: ${moderatePortfolio.portfolio.metadata.riskProfile}`);
      console.log(`   🪙 Tokens: ${moderatePortfolio.portfolio.tokens.length}`);
      console.log(`   📊 Market Alignment: ${moderatePortfolio.analysis.marketAlignmentScore}/100`);
      
      moderatePortfolio.portfolio.tokens.forEach((token, index) => {
        console.log(`   ${index + 1}. ${token.symbol} (${token.allocation.toFixed(1)}%) - Momentum: ${token.momentumScore}/100`);
      });
    } catch (error: any) {
      console.error(`❌ Moderate portfolio failed:`, error.message);
    }

    // Test 3: Aggressive Portfolio
    console.log("\n3️⃣ TESTING AGGRESSIVE PORTFOLIO");
    try {
      const aggressivePortfolio = await portfolioService.generateEqualAllocationPortfolio(6, 'aggressive');
      console.log(`✅ Aggressive Portfolio Generated:`);
      console.log(`   📝 Name: ${aggressivePortfolio.portfolio.name}`);
      console.log(`   🎯 Strategy: ${aggressivePortfolio.portfolio.metadata.strategy}`);
      console.log(`   ⚠️ Risk Profile: ${aggressivePortfolio.portfolio.metadata.riskProfile}`);
      console.log(`   🪙 Tokens: ${aggressivePortfolio.portfolio.tokens.length}`);
      console.log(`   📊 Market Alignment: ${aggressivePortfolio.analysis.marketAlignmentScore}/100`);
      
      aggressivePortfolio.portfolio.tokens.forEach((token, index) => {
        console.log(`   ${index + 1}. ${token.symbol} (${token.allocation.toFixed(1)}%) - Confidence: ${token.confidence}%`);
      });
    } catch (error: any) {
      console.error(`❌ Aggressive portfolio failed:`, error.message);
    }

    console.log("\n🤖 Testing Integrated Agentic System...");
    console.log("=".repeat(50));

    // Test 4: Full Agentic System Integration
    console.log("\n4️⃣ TESTING AGENTIC SYSTEM INTEGRATION");
    try {
      const agenticSystem = new AgenticSystem();
      
      // Simulate some market data first
      console.log("📊 Adding sample market data...");
      
      // Add some mock sentiment data
      trendAnalyzer.addSentimentData({
        interval: '24h',
        total: 100,
        counts: { positive: 45, negative: 35, neutral: 20 },
        percentages: { positive: 45, negative: 35, neutral: 20 }
      });

      // Add mock Fear & Greed data
      trendAnalyzer.addFearGreedAnalysis({
        today: { 
          value: "65", 
          value_classification: "Greed", 
          timestamp: new Date().toISOString() 
        },
        yesterday: { 
          value: "58", 
          value_classification: "Greed", 
          timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() 
        },
        change: 7,
        trend: "increasing",
        classification: "Greed"
      });

      // Test manual portfolio generation
      console.log("🎯 Generating portfolio via Agentic System...");
      const systemPortfolio = await agenticSystem.generatePortfolioNow('moderate', 5);
      
      console.log(`✅ Agentic System Portfolio Generated!`);
      console.log(`   🎯 Recommended Action: ${systemPortfolio.analysis.recommendedAction}`);
      console.log(`   📊 Diversification Score: ${systemPortfolio.analysis.diversificationScore}/100`);
      
      // Get current portfolio
      const currentPortfolio = agenticSystem.getCurrentPortfolio();
      console.log(`📋 Current portfolio in system: ${currentPortfolio ? 'Available' : 'None'}`);
      console.log(`⏰ Last update: ${new Date(agenticSystem.getLastPortfolioUpdate()).toLocaleString()}`);

    } catch (error: any) {
      console.error(`❌ Agentic system integration failed:`, error.message);
    }

    console.log("\n✅ Portfolio system testing completed!");
    console.log("\n🚀 Next Steps:");
    console.log("1. Start the server: npm start");
    console.log("2. Test API endpoints:");
    console.log("   - GET /api/portfolio/current");
    console.log("   - POST /api/portfolio/generate");
    console.log("3. The agentic system will automatically generate portfolios every 2 hours");

  } catch (error: any) {
    console.error("❌ Portfolio testing failed:", error);
    
    if (error.message?.includes('API key')) {
      console.log("\n💡 Tip: Make sure your Solana Tracker API key is valid and has sufficient credits");
    }
  }
}