# 🤖 Paperhead Agentic Trading System

A sophisticated autonomous trading system that continuously monitors the **Solana ecosystem**, analyzes market trends, and makes intelligent trading decisions using AI-powered analysis.

## 🌟 Features

### Core Capabilities
- **🔄 Continuous Market Monitoring**: 24/7 autonomous operation with dual-loop architecture
- **🤖 AI-Powered Topic Discovery**: Uses GPT-4o-mini to dynamically extract trending Solana topics from news headlines
- **📊 Dynamic Topic Generation**: Discovers new trending Solana projects and tokens automatically
- **😊 Advanced Sentiment Analysis**: Multi-timeframe sentiment tracking with trend analysis
- **📈 Intelligent Trend Detection**: Historical pattern analysis with momentum scoring
- **💰 Autonomous Trading**: AI-driven decision making with risk management
- **🛡️ Risk Management**: Portfolio protection with confidence-based execution

### Data Sources
- **📰 News Analysis**: crypto-news51.p.rapidapi.com for article volume and sentiment
- **🤖 AI Topic Extraction**: OpenAI GPT-4o-mini for intelligent topic discovery
- **😊 Sentiment Tracking**: 24h/48h sentiment data with trend comparison
- **📊 Topic Scoring**: Popularity metrics based on news article volume
- **📈 Trend Analysis**: Historical momentum and pattern recognition

## 🏗️ Architecture

### Core Components

1. **AgenticSystem** (`src/agent/agenticSystem.ts`)
   - Main orchestrator running two loops:
     - Main loop: Full analysis every hour
     - Quick loop: High-priority topics every 15 minutes

2. **NewsService** (`src/services/newsService.ts`)
   - Fetches news articles and sentiment data from RapidAPI
   - Calculates topic popularity scores
   - Handles API rate limiting and error recovery

3. **TopicGenerator** (`src/services/topicGenerator.ts`)
   - Manages 90+ Solana-specific base topics (DeFi, memecoins, NFTs, gaming, infrastructure)
   - **🤖 AI-Powered Topic Discovery**: Uses GPT-4o-mini to intelligently extract new Solana topics from headlines
   - **Smart Categorization**: Organizes topics into DeFi, memecoins, infrastructure, gaming, NFT, tools, and general categories
   - **Dynamic Topic Management**: Automatically discovers trending Solana projects and tokens
   - **Fallback System**: Robust keyword-based extraction when AI service is unavailable
   - **Topic Cleanup**: Maintains relevance by removing outdated dynamic topics

4. **TrendAnalyzer** (`src/services/trendAnalyzer.ts`)
   - Tracks historical data for trend analysis
   - Calculates momentum scores combining popularity and trends
   - Provides sentiment trend analysis

5. **StatusApi** (`src/agent/statusApi.ts`)
   - Monitoring and health check endpoints
   - Real-time system status and analytics

## 📊 Decision Making Algorithm

The agent uses a multi-factor analysis approach:

### 1. Topic Analysis
- **Popularity Score**: Number of articles (0-100 scale)
- **Trend Strength**: Percentage change from previous period
- **Momentum Score**: Combined popularity + trend weighting

### 2. Sentiment Weighting
- **Current Sentiment**: Positive/negative/neutral percentages
- **Sentiment Trend**: Improving/declining/stable over time
- **Market Context**: Overall crypto market mood

### 3. Risk Assessment
- **Portfolio Limits**: Never risk more than 10% per trade
- **Confidence Thresholds**: Only execute trades with 70+ confidence
- **Solana Focus**: Prioritizes Solana ecosystem tokens

### 4. Trading Logic
```
IF (trending_topic_strength > 50% AND sentiment_improving AND confidence > 70)
  THEN consider_buy_signal
ELIF (falling_topic_strength < -30% AND sentiment_declining)
  THEN consider_sell_signal
ELSE
  THEN hold_position
```

## 🔧 Configuration

### Environment Variables
```bash
# Server Configuration
NODE_ENV=development
PORT=8080
INTERNAL_API_KEY=your_internal_api_key

# RapidAPI (for crypto news data)
RAPID_API_KEY=your_rapidapi_key

# Solana Blockchain
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
SOLANA_PRIVATE_KEY=your_base58_encoded_private_key

# OpenAI (for AI-powered topic extraction)
OPENAI_API_KEY=your_openai_api_key
```

### System Parameters
- **Main Analysis Loop**: 1 hour intervals for comprehensive market analysis
- **Quick Update Loop**: 15 minutes for high-priority topic monitoring  
- **Topic Limit**: 15 topics per cycle to manage API rate limits
- **AI Topic Extraction**: Up to 15 new topics per analysis cycle
- **Confidence Threshold**: 70% minimum for trade execution
- **Risk Limit**: Maximum 10% of portfolio per trade

## 🚀 Usage

### Start the System
```bash
npm run dev    # Development mode
npm start      # Production mode
```

### Monitor Status
The system provides real-time logging with:
- 📊 Analysis summaries every cycle
- 🔥 Trending topic alerts
- 💡 Trading decisions and reasoning
- ⚠️ Error handling and recovery

### Graceful Shutdown
- `Ctrl+C` or `SIGTERM` for clean shutdown
- Completes current analysis before stopping
- Preserves state and historical data

## 📈 Sample Output

```
🔄 Starting Main Analysis Cycle
========================================

📊 Updating sentiment data...
✅ Sentiment data received for 24h

🎯 Analyzing 15 topics this cycle
📰 Fetching news for topic: solana
✅ Found 45 articles for solana
...

📊 ANALYSIS SUMMARY
========================================
📈 Topics Tracked: 25
🔥 Rising: 8 | 📉 Falling: 5 | ➡️ Stable: 12
📊 Avg Popularity: 23.4
😊 Sentiment Trend: improving

🚀 TOP TRENDING:
  solana: +67.3% (45 articles)
  memecoins: +34.2% (28 articles)
  defi: +12.8% (52 articles)

🤖 Making Agent Decision...
💡 Agent Decision: {
  action: "buy",
  token: "SOL",
  amount: 5,
  confidence: 85,
  reasoning: "Strong upward trend in Solana ecosystem..."
}

🎯 Executing Decision: BUY
💰 Token: SOL
📊 Amount: 5%
🎯 Confidence: 85%
```

## 🛡️ Safety Features

- **Rate Limiting**: Respects API limits with intelligent batching
- **Error Recovery**: Continues operation despite individual failures
- **Portfolio Protection**: Hard limits on trade sizes
- **Confidence Gating**: Only executes high-confidence decisions
- **Graceful Degradation**: Falls back to basic analysis if services fail

## 🔮 Future Enhancements

- **Machine Learning**: Pattern recognition for better predictions
- **Multi-Chain Support**: Expand beyond Solana ecosystem
- **Social Sentiment**: Twitter/Discord sentiment integration
- **Advanced TA**: Technical analysis indicators
- **Backtesting**: Historical performance analysis
- **Web Dashboard**: Real-time monitoring interface

## 📝 Logs and Monitoring

The system provides comprehensive logging:
- Real-time analysis progress
- Trading decisions with full reasoning
- Error tracking and recovery
- Performance metrics
- Historical trend data

Monitor the console output to track the agent's decision-making process and trading activities. 