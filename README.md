# Paperhead Agent - Autonomous Solana Trading System

An intelligent, autonomous trading agent built for the Solana blockchain that combines real-time market sentiment analysis, trending token detection, and AI-powered decision making to automatically manage cryptocurrency portfolios.

## ✨ Features

### 🎯 Risk Management
You can set the risk level for portfolios in multiple ways:

#### 1. Environment Variable (Recommended for Production)
```bash
# Add to your .env file
RISK_PROFILE=aggressive  # Options: conservative, moderate, aggressive
```

#### 2. Constructor Parameter (Recommended for Scripts/Testing)
```typescript
// In main.ts or any script
const riskProfile = new RiskProfile('conservative'); // Override environment setting
const agent = new Agent(riskProfile);
```

#### 3. Dynamic Runtime Setting
```typescript
const agent = new Agent();
agent.setDefaultRiskProfile('aggressive');  // Change after creation
console.log(agent.getDefaultRiskProfile()); // Get current setting
```

#### 4. Per-Portfolio Basis
```typescript
// Generate specific portfolios with different risk levels
const conservativePortfolio = await agent.generatePortfolioNow(new RiskProfile('conservative'), 5);
const aggressivePortfolio = await agent.generatePortfolioNow(new RiskProfile('aggressive'), 10);

// Or use the default risk profile
const defaultPortfolio = await agent.generateDefaultPortfolio(8);
```

**Risk Profile Characteristics:**
*(Defined in `src/config/trading.ts` as the single source of truth)*
- **`conservative`**: Lower risk tokens (0-4 risk score), higher liquidity requirements, more stable allocations, **48-hour update interval**
- **`moderate`**: Balanced risk/reward (0-7 risk score), standard liquidity, default for most users, **24-hour update interval**
- **`aggressive`**: Higher risk tolerance (0-10 risk score), includes volatile tokens, higher potential returns, **12-hour update interval**

## 📊 Enhanced Logging System

The system now provides comprehensive, insightful logging throughout all operations:

### 🚀 System Startup Diagnostics
- **Environment Validation**: Checks all required API keys and environment variables
- **System Information**: Node.js version, memory usage, startup time
- **Configuration Summary**: Risk profile, update intervals, data sources
- **Wallet Information**: Solana wallet address and SOL balance

### 📈 Market Analysis Insights
- **Sentiment Analysis**: Real-time crypto sentiment with trend interpretation
- **Fear & Greed Index**: Current values with actionable recommendations
- **Trending Topics**: Rising/falling topics with momentum indicators
- **Token Analysis**: Risk distribution, top performers, volume leaders
- **Market Insights**: AI-generated actionable insights based on current conditions

### 🔍 Trend Analysis Details
- **Historical Data**: Shows data points available for each topic
- **Trend Calculations**: Explains why trends are/aren't detected
- **Trend Strength**: Quantified momentum with direction indicators
- **Troubleshooting**: Clear explanations when insufficient data exists

### 💼 Portfolio Generation Process
- **Market Context**: Current sentiment, Fear & Greed, market conditions
- **Token Scoring**: Detailed scoring process for each risk profile
- **Selection Criteria**: Shows filtering criteria and success rates  
- **Token Details**: Risk scores, liquidity, confidence, and reasoning for each selection
- **Performance Metrics**: Allocation percentages and portfolio analysis

### 🔄 Trading Operations
- **Rebalancing Logic**: Explains when and why portfolio updates occur
- **Market Conditions**: Real-time assessment of trading environment
- **Decision Tracking**: Complete audit trail of all trading decisions
- **Error Handling**: Detailed error messages with troubleshooting guidance

### 📦 Data Management
- **API Status**: Connection status for all external data sources
- **Cache Management**: Shows cache hits/misses and data freshness
- **Rate Limiting**: Monitors API usage and prevents overuse
- **Data Quality**: Validates and reports on data integrity

### 💡 Example Enhanced Log Output
```
🎭 PAPERHEAD AGENTIC TRADING SYSTEM INITIALIZATION
💰 24-Hour Automatic Portfolio Rebalancing System
🎯 10-Token Diversified Portfolio Strategy

⚙️ SYSTEM STARTUP DIAGNOSTICS
──────────────────────────────────────────────────
🌐 Node.js Version: v18.17.0
📅 Startup Time: 12/15/2024, 3:45:22 PM
💾 Memory Usage: 245MB

🔐 ENVIRONMENT VALIDATION:
   ✅ OPENAI_API_KEY: Configured
   ✅ RAPID_API_KEY: Configured  
   ✅ SOLANA_TRACKER_API_KEY: Configured
   ✅ SOLANA_RPC_URL: Configured
   ✅ SOLANA_PRIVATE_KEY: Configured

🔗 Connecting to Solana blockchain...
✅ Solana Service initialized. Wallet: Q6DB5ixc67CAQsDpkNcviwgFdbGVRaAoYyxHXgFDXaF
💰 Current Balance: 2.4567 SOL

📊 COMPREHENSIVE ANALYSIS SUMMARY
==================================================
🎯 Market Condition: BULLISH
📈 Topics: 15 tracked | 🔥 3 rising | 📉 1 falling
😊 Sentiment: improving
😱 Fear & Greed: 71 (Greed) (stable)

😊 SENTIMENT ANALYSIS:
   📊 Current: 38.9% positive | 13.8% negative
   📈 Total Articles: 1387
   🔄 Trend: stable (+0.3%)
   💡 Interpretation: Neutral ➡️

🚀 TOP TRENDING TOPICS:
   1. 📈 solana: +5.2% (51 articles)
   2. 📈 pump: +3.1% (12 articles)
   3. 📉 bonk: -2.4% (9 articles)

💡 MARKET INSIGHTS:
   1. ✅ Low market risk environment - good for position building
   2. 🎯 Aligned bullish signals - favorable for portfolio building
   3. 📊 Market conditions are neutral - balanced approach recommended

💼 PORTFOLIO GENERATION STARTING
🎯 Target: 10-token equal allocation portfolio
⚠️ Risk Profile: MODERATE
💰 Allocation per token: 10.0%

🔍 Market Context:
   😊 Sentiment: 38.9% positive
   😱 Fear & Greed: 71 (Greed)
   📊 Market Condition: BULLISH
   🔥 Trending Topics: 15 identified

⚖️ SCORING AND FILTERING TOKENS...
✅ Scored 58 tokens for moderate portfolio

📋 MODERATE CRITERIA:
   ⚠️ Max Risk Score: 7/10
   💰 Min Liquidity: $100K
   📈 Min Confidence: 50%

🪙 SELECTED TOKENS SUMMARY:
   1. SOL (Solana) 
      📊 Sentiment: 85/100 | Risk: 2/10
      💰 Liquidity: $45,234K
      📈 Confidence: 92% | Momentum: 78/100
      💭 Strong ecosystem growth with increasing DeFi adoption. Low risk due to...
```

This enhanced logging system provides complete transparency into:
- ✅ **System Health**: All components are working correctly
- 📊 **Market Analysis**: Real-time insights for informed decisions  
- 🎯 **Portfolio Logic**: Why specific tokens were selected
- 🔄 **Trading Rationale**: Complete audit trail of decisions
- ⚠️ **Risk Management**: How risk profiles affect token selection
- 💡 **Actionable Insights**: AI-generated market recommendations

The logs are designed to be both human-readable for monitoring and comprehensive enough for debugging and optimization.