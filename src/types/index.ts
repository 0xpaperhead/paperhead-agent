// API Response structure - this is what we get from the API
export interface NewsArticle {
  title: string;
  summary: string;
  media: string[];
  link: string;
  authors: Array<{
    name: string;
  }>;
  published: string;
  category: string;
  subCategory: string;
  language: string;
  timeZone: string;
  sentiment: {
    label: "positive" | "neutral" | "negative";
    score: number;
  };
  // Legacy fields for backward compatibility
  url?: string;
  published_at?: string;
  source?: string;
}

export interface TopicScore {
  topic: string;
  popularityScore: number; // 0-100 based on article count
  articles: NewsArticle[];
  timestamp: number;
}

export interface SentimentData {
  interval: "24h" | "48h";
  total: number;
  counts: {
    positive: number;
    neutral: number;
    negative: number;
  };
  percentages: {
    positive: number;
    neutral: number;
    negative: number;
  };
}

export interface TrendAnalysis {
  topic: string;
  currentScore: number;
  previousScore: number;
  trend: "rising" | "falling" | "stable";
  trendStrength: number; // percentage change
}

export enum AgentTradeAction {
  Buy = "buy",
  Sell = "sell",
  Hold = "hold",
}

export interface AgentDecision {
  action: AgentTradeAction;
  token?: string;
  amount?: number;
  confidence: number; // 0-100
  reasoning: string;
  timestamp: number;
}

export interface AgentState {
  isRunning: boolean;
  lastUpdate: number;
  currentTopics: TopicScore[];
  sentimentHistory: SentimentData[];
  trendAnalysis: TrendAnalysis[];
  lastDecision?: AgentDecision;
}

export interface FearGreedData {
  value: string;
  value_classification: "Extreme Fear" | "Fear" | "Neutral" | "Greed" | "Extreme Greed";
  time_until_update?: string;
}

export interface FearGreedResponse {
  [timestamp: string]: FearGreedData;
}

export interface FearGreedAnalysis {
  today: FearGreedData & { timestamp: string };
  yesterday: FearGreedData & { timestamp: string };
  change: number; // Difference between today and yesterday
  trend: "increasing" | "decreasing" | "stable";
  classification: string;
}

// Trending Tokens API Types
export interface TokenMetadata {
  name: string;
  symbol: string;
  mint: string;
  uri: string;
  decimals: number;
  hasFileMetaData: boolean;
  createdOn: string;
  description: string;
  image: string;
  showName: boolean;
  twitter?: string;
  website?: string;
  creation: {
    creator: string;
    created_tx: string;
    created_time: number;
  };
}

export interface PoolLiquidity {
  quote: number;
  usd: number;
}

export interface TokenPrice {
  quote: number;
  usd: number;
}

export interface MarketCap {
  quote: number;
  usd: number;
}

export interface TokenSecurity {
  freezeAuthority: string | null;
  mintAuthority: string | null;
}

export interface PoolTransactions {
  buys: number;
  total: number;
  volume: number;
  sells: number;
}

export interface TokenPool {
  liquidity: PoolLiquidity;
  price: TokenPrice;
  tokenSupply: number;
  lpBurn: number;
  tokenAddress: string;
  marketCap: MarketCap;
  decimals: number;
  security: TokenSecurity;
  quoteToken: string;
  market: string;
  lastUpdated: number;
  createdAt: number;
  txns: PoolTransactions;
  deployer: string | null;
  poolId: string;
}

export interface PriceEvents {
  "1m"?: { priceChangePercentage: number };
  "5m"?: { priceChangePercentage: number };
  "15m"?: { priceChangePercentage: number };
  "30m"?: { priceChangePercentage: number };
  "1h"?: { priceChangePercentage: number };
  "2h"?: { priceChangePercentage: number };
  "3h"?: { priceChangePercentage: number };
  "4h"?: { priceChangePercentage: number };
  "5h"?: { priceChangePercentage: number };
  "6h"?: { priceChangePercentage: number };
  "12h"?: { priceChangePercentage: number };
  "24h"?: { priceChangePercentage: number };
}

export interface TokenRisk {
  name: string;
  description: string;
  value: string;
  level: "low" | "medium" | "high" | "danger";
  score: number;
}

export interface TokenRiskAssessment {
  rugged: boolean;
  risks: TokenRisk[];
  score: number; // 1-10 risk score
}

export interface TrendingToken {
  token: TokenMetadata;
  pools: TokenPool[];
  events: PriceEvents;
  risk: TokenRiskAssessment;
  buysCount: number;
  sellsCount: number;
}

export interface TrendingTokensResponse {
  tokens: TrendingToken[];
  fetchedAt: number;
}

// Portfolio Management Types
export interface PortfolioToken {
  symbol: string;
  mint: string;
  name: string;
  allocation: number; // Percentage (0-100)
  reasoning: string;
  sentimentScore: number; // Composite score from all analysis
  riskScore: number; // From token risk assessment
  momentumScore: number; // From price momentum
  confidence: number; // Overall confidence in this pick
}

export type RiskProfile = "conservative" | "moderate" | "aggressive";

export interface Portfolio {
  id: string;
  name: string;
  description: string;
  totalAllocation: number; // Should be 100%
  tokens: PortfolioToken[];
  metadata: {
    createdAt: number;
    basedOnData: {
      fearGreedValue: number;
      marketSentiment: string;
      topTrendingTopics: string[];
      totalTokensAnalyzed: number;
    };
    strategy: "equal_weight" | "momentum_based" | "sentiment_driven" | "risk_adjusted";
    riskProfile: RiskProfile;
  };
}

export interface PortfolioAnalysis {
  portfolio: Portfolio;
  analysis: {
    averageRiskScore: number;
    averageMomentumScore: number;
    averageSentimentScore: number;
    diversificationScore: number; // How well diversified the portfolio is
    marketAlignmentScore: number; // How well aligned with current market sentiment
    recommendedAction: "build" | "wait" | "adjust";
    warnings: string[];
    strengths: string[];
  };
}

// Trading Configuration Types
export interface TradingConfiguration {
  enableAutomaticTrading: boolean;
  maxPositionSizeSOL: number; // Maximum SOL amount per trade
  minTradeAmountSOL: number; // Minimum SOL amount per trade
  slippageTolerance: number; // Percentage (e.g., 0.5 for 0.5%)
  minConfidenceThreshold: number; // Minimum confidence score to execute trade
  maxRiskScore: number; // Maximum risk score to allow
  delayBetweenTradesMs: number; // Delay between trades in milliseconds
  portfolioUpdateIntervalMs: number; // How often to automatically rebalance portfolio
  computeUnitPrice: number; // Compute unit price for transactions
  emergencyStopEnabled: boolean; // Enable emergency stop functionality
  maxDailyLossPercentage: number; // Maximum daily loss percentage
  rebalanceThreshold: number; // Threshold for portfolio rebalancing
}

// Trading Execution Types
export interface TradeExecution {
  token: PortfolioToken;
  action: "buy" | "sell";
  amountSOL: number;
  targetAllocation: number;
  currentAllocation: number;
  priority: "high" | "medium" | "low";
}

export interface TradeResult {
  token: PortfolioToken;
  success: boolean;
  error?: string;
  requestedAmountSOL: number;
  actualAmountSOL: number;
  tokensReceived: number;
  transactionHash: string | null;
  executedAt: number;
  gasUsed?: number;
  effectivePrice?: number;
}

// Wallet Management Types
export interface WalletBalance {
  tokenMint: string;
  balance: number;
  valueSOL: number;
  valueUSD: number;
  lastUpdated: number;
}

export interface PortfolioBalance {
  totalValueSOL: number;
  totalValueUSD: number;
  tokenBalances: WalletBalance[];
  lastUpdated: number;
  unrealizedPnL: number;
  realizedPnL: number;
}

// Trading History Types
export interface TradeHistory {
  id: string;
  portfolioId: string;
  trades: TradeResult[];
  totalInvestedSOL: number;
  totalTokensReceived: number;
  successRate: number;
  averageSlippage: number;
  executedAt: number;
  executionTimeMs: number;
}

// Risk Management Types
export interface RiskMetrics {
  portfolioRiskScore: number;
  concentrationRisk: number;
  liquidityRisk: number;
  volatilityRisk: number;
  correlationRisk: number;
  maxDrawdown: number;
  sharpeRatio: number;
  dailyVaR: number; // Value at Risk
}

// Performance Tracking Types
export interface PerformanceMetrics {
  totalReturn: number;
  dailyReturn: number;
  weeklyReturn: number;
  monthlyReturn: number;
  annualizedReturn: number;
  volatility: number;
  maxDrawdown: number;
  winRate: number;
  profitFactor: number;
  averageWin: number;
  averageLoss: number;
}
