# Integration Test Suite

This directory contains comprehensive integration tests for the Paperhead Agentic Trading System. These tests use **real APIs and live data** to ensure the system works correctly in production environments.

## Test Categories

### 1. AgenticSystem Integration Tests (`agenticSystem.integration.test.ts`)
- **System initialization and blockchain connection**
- **Portfolio generation with real market data**
- **Market data integration and processing**
- **State management and consistency**
- **Error handling and resilience**
- **Real-world data validation**
- **Performance and scalability**

### 2. Services Integration Tests (`services.integration.test.ts`)
- **NewsService**: Real crypto news and sentiment analysis
- **TopicGenerator**: AI-powered topic discovery
- **TrendAnalyzer**: Historical trend analysis
- **TrendingTokensService**: Live Solana token data
- **PortfolioService**: AI-powered portfolio construction
- **Service integration and data flow**

### 3. End-to-End Integration Tests (`endToEnd.integration.test.ts`)
- **Complete system flow simulation**
- **Multiple portfolio generation scenarios**
- **Data consistency across operations**
- **Real-time market data updates**
- **Actionable portfolio recommendations**
- **API rate limit handling**
- **Autonomous decision making**
- **Performance and reliability**

### 4. Market Conditions Integration Tests (`marketConditions.integration.test.ts`)
- **Real market sentiment analysis**
- **Fear & Greed Index tracking**
- **Trending topics with live news**
- **Token market analysis**
- **Market condition determination**
- **Portfolio adaptation to market conditions**
- **Volatile market handling**
- **Real-time price change processing**

## Prerequisites

Before running the tests, ensure you have the following environment variables set in your `.env` file:

```env
# Required for all tests
RAPID_API_KEY=your_rapid_api_key
SOLANA_TRACKER_API_KEY=your_solana_tracker_api_key
OPENAI_API_KEY=your_openai_api_key
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
SOLANA_PRIVATE_KEY=your_base58_encoded_private_key
```

### API Keys Required

1. **RapidAPI Key**: For crypto news and sentiment data
   - Get from: https://rapidapi.com/
   - Subscribe to: "Crypto News" and "Crypto Fear & Greed Index" APIs

2. **Solana Tracker API Key**: For trending token data
   - Get from: https://solanatracker.io/
   - Free tier available

3. **OpenAI API Key**: For AI-powered analysis
   - Get from: https://platform.openai.com/
   - Requires credits for API usage

4. **Solana RPC URL**: For blockchain connection
   - Use: `https://api.mainnet-beta.solana.com` (free)
   - Or get from: QuickNode, Helius, etc.

5. **Solana Private Key**: For wallet operations
   - Generate a new wallet for testing
   - Use base58 encoded private key

## Running the Tests

### Run All Integration Tests
```bash
npm test
```

### Run Specific Test Files
```bash
# Run only AgenticSystem tests
npm test -- --testPathPattern=agenticSystem.integration.test.ts

# Run only Services tests  
npm test -- --testPathPattern=services.integration.test.ts

# Run only End-to-End tests
npm test -- --testPathPattern=endToEnd.integration.test.ts

# Run only Market Conditions tests
npm test -- --testPathPattern=marketConditions.integration.test.ts
```

### Run Tests with Coverage
```bash
npm run test:coverage
```

### Run Tests in Watch Mode
```bash
npm run test:watch
```

## Test Configuration

The tests are configured with:
- **Timeout**: 2-3 minutes per test (for real API calls)
- **Sequential execution**: Tests run one at a time to avoid API rate limits
- **Real data**: No mocks - all tests use live APIs
- **Environment validation**: Tests fail fast if required environment variables are missing

## What These Tests Validate

### 🔗 Real API Integration
- Connects to actual crypto news APIs
- Fetches live Solana token data
- Uses real OpenAI GPT models
- Validates blockchain connectivity

### 📊 Market Data Processing
- Processes real market sentiment
- Analyzes current Fear & Greed Index
- Tracks trending Solana topics
- Evaluates token momentum and risk

### 🤖 AI Decision Making
- Tests GPT-4o-mini analysis
- Validates portfolio reasoning
- Checks confidence scoring
- Ensures decision quality

### 🎯 Portfolio Generation
- Creates portfolios with real tokens
- Tests different risk profiles
- Validates allocation strategies
- Checks market alignment

### ⚡ Performance
- Measures response times
- Tests concurrent operations
- Validates state consistency
- Checks resource usage

### 🛡️ Error Handling
- Tests API failure scenarios
- Validates rate limit handling
- Checks data validation
- Ensures graceful degradation

## Expected Test Duration

- **Single test file**: 3-5 minutes
- **Full test suite**: 15-20 minutes
- **Coverage report**: 20-25 minutes

## Test Output

The tests provide detailed console output including:
- Real-time market data
- Generated portfolio details
- Performance metrics
- API response validation
- Error handling results

## Troubleshooting

### Common Issues

1. **API Key Errors**
   - Verify all environment variables are set
   - Check API key validity and credits
   - Ensure proper API subscriptions

2. **Timeout Errors**
   - Increase test timeout if needed
   - Check internet connection
   - Verify API service status

3. **Rate Limit Errors**
   - Tests are designed to handle rate limits
   - May need to wait between test runs
   - Consider upgrading API plans

4. **Blockchain Connection Issues**
   - Verify Solana RPC URL is accessible
   - Check wallet private key format
   - Ensure sufficient SOL for operations

### Debug Mode

Run tests with verbose output:
```bash
npm test -- --verbose
```

## Contributing

When adding new tests:
1. Use real APIs (no mocks)
2. Add proper error handling
3. Include performance validation
4. Document expected behavior
5. Test edge cases
6. Validate real-world scenarios

## Security Note

These tests use real API keys and blockchain connections. Never commit sensitive credentials to version control. Use environment variables for all secrets.

---

# Detailed Test Explanations

## Overview
The Paperhead AI trading agent has **64 integration tests** across 4 test suites that validate the complete autonomous trading system using real-world APIs and live market data.

## Test Files Breakdown

### 1. **agenticSystem.integration.test.ts** (16 tests)
**Tests the core orchestrator that coordinates all trading decisions**

#### **System Initialization (2 tests)**
- **`should initialize blockchain connection and tools`**
  - **Real-world scenario**: System startup with all API connections
  - **APIs tested**: Solana RPC, OpenAI, RapidAPI, SolanaTracker
  - **Validates**: Blockchain connectivity, initial data collection, state consistency
  - **Business logic**: System must successfully connect to all required services

- **`should have no initial portfolio before generation`**
  - **Real-world scenario**: Clean system state at startup
  - **Validates**: Portfolio state is null, last update timestamp is 0
  - **Business logic**: System starts with clean slate before generating portfolios

#### **Portfolio Generation (4 tests)**
- **`should generate conservative portfolio with real data`**
  - **Real-world scenario**: Low-risk portfolio for conservative investors
  - **APIs tested**: All services for comprehensive market analysis
  - **Validates**: 3 tokens, equal allocation (33.33%), risk scores ≤ 10
  - **Business logic**: Conservative portfolios have lower risk scores

- **`should generate moderate portfolio with real data`**
  - **Real-world scenario**: Balanced risk portfolio for moderate investors
  - **Validates**: 5 tokens, equal allocation (20%), moderate risk tolerance
  - **Business logic**: Moderate portfolios allow higher risk than conservative

- **`should generate aggressive portfolio with real data`**
  - **Real-world scenario**: High-risk portfolio for aggressive investors
  - **Validates**: 4 tokens, equal allocation (25%), higher risk tolerance
  - **Business logic**: Aggressive portfolios accept higher risk for potential returns

- **`should update current portfolio after generation`**
  - **Real-world scenario**: Portfolio state management
  - **Validates**: Portfolio update timestamp, current portfolio storage
  - **Business logic**: System maintains current portfolio state

#### **Market Data Integration (2 tests)**
- **`should fetch and process real market data`**
  - **Real-world scenario**: Real-time market data processing
  - **APIs tested**: News APIs, sentiment analysis, token tracking
  - **Validates**: Topic scores (0-100), sentiment data structure, article processing
  - **Business logic**: Market data is properly structured and processed

- **`should handle API errors gracefully`**
  - **Real-world scenario**: API failures and network issues
  - **Validates**: System continues functioning despite API failures
  - **Business logic**: Graceful error handling maintains system stability

#### **Real-World Data Validation (2 tests)**
- **`should work with current Solana ecosystem data`**
  - **Real-world scenario**: Integration with live Solana blockchain
  - **Validates**: Valid Solana addresses using PublicKey class, real token data
  - **Business logic**: System works with actual blockchain data

- **`should generate different portfolios over time`**
  - **Real-world scenario**: Portfolio evolution with market changes
  - **Validates**: Unique portfolio IDs, different timestamps
  - **Business logic**: System generates fresh portfolios based on current data

#### **Error Handling and Resilience (2 tests)**
- **`should handle portfolio generation with insufficient data`**
  - **Real-world scenario**: Limited market data availability
  - **Validates**: Single token portfolio generation, 100% allocation
  - **Business logic**: System adapts to data limitations

- **`should validate portfolio constraints`**
  - **Real-world scenario**: Portfolio validation and constraint checking
  - **Validates**: Total allocation = 100%, valid token properties, risk/confidence ranges
  - **Business logic**: Portfolio constraints are enforced

#### **Performance and Scalability (4 tests)**
- **`should complete portfolio generation within reasonable time`**
  - **Real-world scenario**: Performance under normal conditions
  - **Validates**: Portfolio generation completes in < 60 seconds
  - **Business logic**: System meets performance requirements

- **`should handle multiple portfolio generations`**
  - **Real-world scenario**: Concurrent portfolio requests
  - **Validates**: Multiple risk profiles processed simultaneously
  - **Business logic**: System handles concurrent operations correctly

### 2. **services.integration.test.ts** (25 tests)
**Tests individual service components that power the trading system**

#### **NewsService Integration (5 tests)**
- **`should fetch real news articles for Solana topics`**
  - **Real-world scenario**: Crypto news aggregation
  - **APIs tested**: RapidAPI crypto news endpoints
  - **Validates**: Article structure, sentiment analysis, topic relevance
  - **Business logic**: News data is properly fetched and processed

- **`should fetch sentiment data from real API`**
  - **Real-world scenario**: Market sentiment analysis
  - **Validates**: Sentiment percentages (positive/negative/neutral sum to 100%)
  - **Business logic**: Sentiment data accurately reflects market mood

- **`should fetch Fear & Greed Index from real API`**
  - **Real-world scenario**: Market psychology indicator
  - **Validates**: Index value (0-100), classification (5 categories)
  - **Business logic**: Fear & Greed Index properly classified

- **`should batch process multiple topics`**
  - **Real-world scenario**: Parallel news processing
  - **Validates**: Multiple topic processing, performance optimization
  - **Business logic**: Efficient batch processing of market topics

- **`should handle comprehensive parallel data fetch`**
  - **Real-world scenario**: Complete data pipeline
  - **Validates**: Topic scores, sentiment data, Fear & Greed analysis
  - **Business logic**: All data sources integrated successfully

#### **TopicGenerator Integration (5 tests)**
- **`should have predefined Solana topics`**
  - **Real-world scenario**: Solana ecosystem coverage
  - **Validates**: 90+ predefined topics, key protocols included
  - **Business logic**: Comprehensive Solana ecosystem topic coverage

- **`should extract topics from real headlines using AI`**
  - **Real-world scenario**: AI-powered topic discovery
  - **APIs tested**: OpenAI GPT for topic extraction
  - **Validates**: Relevant topic extraction from headlines
  - **Business logic**: AI identifies trending topics from news

- **`should get topics for analysis`**
  - **Real-world scenario**: Topic selection for analysis
  - **Validates**: Specified number of topics returned
  - **Business logic**: System selects appropriate topics for analysis

- **`should manage dynamic topics`**
  - **Real-world scenario**: Topic evolution and discovery
  - **Validates**: Dynamic topic addition, topic list growth
  - **Business logic**: System adapts to new trending topics

- **`should categorize topics correctly`**
  - **Real-world scenario**: Topic classification
  - **Validates**: DeFi, memecoins, infrastructure, tools categories
  - **Business logic**: Topics are properly categorized for analysis

#### **TrendAnalyzer Integration (4 tests)**
- **`should analyze trends from real data`**
  - **Real-world scenario**: Trend analysis and momentum calculation
  - **Validates**: Trend calculations, momentum scoring
  - **Business logic**: Trends are accurately calculated from historical data

- **`should handle sentiment data`**
  - **Real-world scenario**: Sentiment trend analysis
  - **Validates**: Sentiment data integration, historical tracking
  - **Business logic**: Sentiment trends properly analyzed

- **`should handle Fear & Greed data`**
  - **Real-world scenario**: Market psychology tracking
  - **Validates**: Fear & Greed historical data, trend analysis
  - **Business logic**: Market psychology trends tracked correctly

- **`should calculate market conditions`**
  - **Real-world scenario**: Market condition classification
  - **Validates**: Bullish/bearish/neutral classification
  - **Business logic**: Market conditions properly determined

#### **TrendingTokensService Integration (6 tests)**
- **`should fetch real trending tokens`**
  - **Real-world scenario**: Live token tracking
  - **APIs tested**: SolanaTracker API
  - **Validates**: Token metadata, valid Solana addresses
  - **Business logic**: Real Solana tokens are tracked and analyzed

- **`should get market analysis from real data`**
  - **Real-world scenario**: Token market analysis
  - **Validates**: Total tokens, market cap data, analysis metrics
  - **Business logic**: Market analysis provides comprehensive token insights

- **`should get top momentum tokens`**
  - **Real-world scenario**: Momentum-based token selection
  - **Validates**: Momentum scores (0-100), token ranking
  - **Business logic**: High-momentum tokens are properly identified

- **`should analyze token opportunities`**
  - **Real-world scenario**: Investment opportunity analysis
  - **Validates**: Opportunity scoring, risk assessment
  - **Business logic**: Investment opportunities are properly evaluated

- **`should get low-risk tokens`**
  - **Real-world scenario**: Conservative token selection
  - **Validates**: Risk scores (0-10), conservative filtering
  - **Business logic**: Low-risk tokens are accurately identified

- **`should get high-liquidity tokens`**
  - **Real-world scenario**: Liquidity-based token filtering
  - **Validates**: Liquidity thresholds, USD values
  - **Business logic**: High-liquidity tokens are properly filtered

#### **PortfolioService Integration (3 tests)**
- **`should generate portfolio with real market data`**
  - **Real-world scenario**: AI-powered portfolio construction
  - **APIs tested**: All services for comprehensive analysis
  - **Validates**: Portfolio structure, token selection, allocation logic
  - **Business logic**: Portfolios are constructed with real market data

- **`should generate different risk profiles`**
  - **Real-world scenario**: Risk-based portfolio customization
  - **Validates**: Conservative, moderate, aggressive risk profiles
  - **Business logic**: Different risk profiles produce appropriate portfolios

- **`should provide meaningful portfolio analysis`**
  - **Real-world scenario**: Portfolio performance analysis
  - **Validates**: Analysis metrics, warnings, strengths identification
  - **Business logic**: Portfolio analysis provides actionable insights

#### **Service Integration and Data Flow (1 test)**
- **`should integrate services for complete market analysis`**
  - **Real-world scenario**: Complete data pipeline integration
  - **APIs tested**: All services working together
  - **Validates**: End-to-end data flow, service coordination
  - **Business logic**: All services work together seamlessly

### 3. **endToEnd.integration.test.ts** (11 tests)
**Tests the complete system workflow from data ingestion to trading decisions**

#### **Complete System Flow (8 tests)**
- **`should perform full market analysis and decision making flow`**
  - **Real-world scenario**: Complete autonomous trading cycle
  - **APIs tested**: All integrated APIs in sequence
  - **Validates**: Full workflow, decision quality, portfolio generation
  - **Business logic**: Complete autonomous trading workflow functions correctly

- **`should handle multiple portfolio generations with different risk profiles`**
  - **Real-world scenario**: Portfolio diversification across risk levels
  - **Validates**: Multiple risk profiles, portfolio differentiation
  - **Business logic**: System generates appropriate portfolios for different risk appetites

- **`should maintain data consistency across operations`**
  - **Real-world scenario**: System reliability under multiple operations
  - **Validates**: State consistency, data integrity
  - **Business logic**: System maintains consistent state across operations

- **`should handle real-time market data updates`**
  - **Real-world scenario**: Live market data processing
  - **Validates**: Real-time data integration, update handling
  - **Business logic**: System processes live market data correctly

- **`should provide actionable portfolio recommendations`**
  - **Real-world scenario**: Investment decision support
  - **Validates**: Recommendation quality, actionable insights
  - **Business logic**: Recommendations are practical and well-reasoned

- **`should handle API rate limits gracefully`**
  - **Real-world scenario**: API rate limiting and throttling
  - **Validates**: Graceful rate limit handling, continued operation
  - **Business logic**: System handles API limitations without failure

- **`should work with current Solana ecosystem`**
  - **Real-world scenario**: Live blockchain integration
  - **Validates**: Current Solana tokens, ecosystem compatibility
  - **Business logic**: System works with actual Solana ecosystem

- **`should demonstrate complete autonomous decision making`**
  - **Real-world scenario**: Fully autonomous trading agent
  - **Validates**: Decision autonomy, reasoning quality
  - **Business logic**: System makes independent trading decisions

#### **Performance and Reliability (3 tests)**
- **`should complete full analysis within reasonable time`**
  - **Real-world scenario**: Performance under normal load
  - **Validates**: Analysis completion time < 90 seconds
  - **Business logic**: System meets performance requirements

- **`should handle multiple concurrent operations`**
  - **Real-world scenario**: High-frequency trading scenarios
  - **Validates**: Concurrent operation handling, performance consistency
  - **Business logic**: System handles multiple simultaneous requests

- **`should maintain state consistency under load`**
  - **Real-world scenario**: System stability under stress
  - **Validates**: State consistency, memory management
  - **Business logic**: System maintains stability under load

### 4. **marketConditions.integration.test.ts** (12 tests)
**Tests the system's ability to adapt to different market conditions**

#### **Real Market Sentiment Analysis (4 tests)**
- **`should detect current market sentiment accurately`**
  - **Real-world scenario**: Live market sentiment detection
  - **APIs tested**: News APIs, sentiment analysis services
  - **Validates**: Sentiment accuracy, classification correctness
  - **Business logic**: Market sentiment is accurately detected

- **`should track Fear & Greed Index changes`**
  - **Real-world scenario**: Market psychology tracking
  - **Validates**: Fear & Greed Index tracking, change detection
  - **Business logic**: Market psychology changes are properly tracked

- **`should analyze trending topics with real news`**
  - **Real-world scenario**: Trend analysis from current events
  - **Validates**: Topic trend analysis, news integration
  - **Business logic**: Trending topics are identified from current news

- **`should determine market conditions correctly`**
  - **Real-world scenario**: Market condition classification
  - **Validates**: Bullish/bearish/neutral classification accuracy
  - **Business logic**: Market conditions are correctly determined

#### **Token Market Analysis (4 tests)**
- **`should analyze current token market conditions`**
  - **Real-world scenario**: Token-specific market analysis
  - **Validates**: Token market metrics, condition assessment
  - **Business logic**: Token market conditions are properly analyzed

- **`should identify high-momentum tokens`**
  - **Real-world scenario**: Momentum-based token selection
  - **Validates**: Momentum calculations, token ranking
  - **Business logic**: High-momentum tokens are accurately identified

- **`should assess token risk accurately`**
  - **Real-world scenario**: Risk assessment for trading decisions
  - **Validates**: Risk scoring accuracy, assessment methodology
  - **Business logic**: Token risk is accurately assessed

- **`should evaluate liquidity conditions`**
  - **Real-world scenario**: Liquidity analysis for trading
  - **Validates**: Liquidity metrics, trading viability
  - **Business logic**: Liquidity conditions are properly evaluated

#### **Market Condition Response (3 tests)**
- **`should adapt portfolio strategy to market conditions`**
  - **Real-world scenario**: Market-responsive portfolio management
  - **Validates**: Strategy adaptation, condition-based adjustments
  - **Business logic**: Portfolio strategy adapts to market conditions

- **`should provide market-aware recommendations`**
  - **Real-world scenario**: Context-aware trading recommendations
  - **Validates**: Recommendation quality, market awareness
  - **Business logic**: Recommendations consider current market conditions

- **`should handle volatile market conditions`**
  - **Real-world scenario**: High volatility trading scenarios
  - **Validates**: Volatility handling, risk management
  - **Business logic**: System handles market volatility appropriately

#### **Real-Time Market Data (1 test)**
- **`should process real-time price changes`**
  - **Real-world scenario**: Live price data processing
  - **Validates**: Price change processing, real-time updates
  - **Business logic**: Real-time price changes are properly processed

- **`should integrate multiple data sources`**
  - **Real-world scenario**: Multi-source data integration
  - **Validates**: Data source integration, consistency
  - **Business logic**: Multiple data sources are integrated effectively

## Key Testing Principles

### **Real-World Validation**
- **No mocking**: All tests use live APIs and real market data
- **Actual blockchain**: Tests use real Solana addresses and tokens
- **Live market conditions**: Tests adapt to current market state
- **Performance constraints**: Tests must complete within realistic timeframes

### **Data Integrity**
- **Structure validation**: All data structures are validated
- **Range checking**: Numeric values are within expected ranges
- **Address validation**: Solana addresses validated using PublicKey class
- **Calculation accuracy**: Mathematical calculations verified (allocations sum to 100%)

### **Business Logic**
- **Risk profile adherence**: Portfolios match requested risk levels
- **Market condition response**: System adapts to market changes
- **Decision quality**: AI reasoning is substantive and relevant
- **Performance requirements**: System meets speed and reliability standards

This comprehensive test suite ensures the Paperhead AI trading agent can reliably operate in real-world market conditions, make autonomous trading decisions, and adapt to changing market dynamics while maintaining data integrity and system performance.