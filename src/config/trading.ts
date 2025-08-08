import { TradingConfiguration } from '../types/index.js';
import { RiskLevel } from '../analysis/RiskProfile.js';

/**
 * Default trading configuration with safe defaults
 */
export const DEFAULT_TRADING_CONFIG: TradingConfiguration = {
  enableAutomaticTrading: true, // Disabled by default for safety
  maxPositionSizeSOL: 1.0, // Maximum 1 SOL per trade
  minTradeAmountSOL: 0.01, // Minimum 0.01 SOL per trade
  slippageTolerance: 0.5, // 0.5% slippage tolerance
  minConfidenceThreshold: 70, // Minimum 70% confidence to execute
  maxRiskScore: 5, // Maximum risk score of 5/10
  delayBetweenTradesMs: 2000, // 2 second delay between trades
  portfolioUpdateIntervalMs: 24 * 60 * 60 * 1000, // 24 hours (default)
  computeUnitPrice: 100000, // Compute unit price for transactions
  emergencyStopEnabled: true, // Enable emergency stop
  maxDailyLossPercentage: 10, // Maximum 10% daily loss
  rebalanceThreshold: 5, // 5% threshold for rebalancing
};

/**
 * Conservative trading configuration
 */
export const CONSERVATIVE_TRADING_CONFIG: TradingConfiguration = {
  enableAutomaticTrading: true,
  maxPositionSizeSOL: 0.5, // Lower position size
  minTradeAmountSOL: 0.01,
  slippageTolerance: 0.3, // Lower slippage tolerance
  minConfidenceThreshold: 80, // Higher confidence requirement
  maxRiskScore: 3, // Lower risk tolerance
  delayBetweenTradesMs: 5000, // More conservative delay
  portfolioUpdateIntervalMs: 48 * 60 * 60 * 1000, // 48 hours (less frequent)
  computeUnitPrice: 150000, // Higher compute unit price for priority
  emergencyStopEnabled: true,
  maxDailyLossPercentage: 5, // Lower daily loss limit
  rebalanceThreshold: 3, // More frequent rebalancing
};

/**
 * Moderate trading configuration
 */
export const MODERATE_TRADING_CONFIG: TradingConfiguration = {
  enableAutomaticTrading: true,
  maxPositionSizeSOL: 2.0, // Moderate position size
  minTradeAmountSOL: 0.05,
  slippageTolerance: 0.5,
  minConfidenceThreshold: 70,
  maxRiskScore: 6,
  delayBetweenTradesMs: 2000,
  portfolioUpdateIntervalMs: 24 * 60 * 60 * 1000, // 24 hours (standard)
  computeUnitPrice: 100000,
  emergencyStopEnabled: true,
  maxDailyLossPercentage: 15,
  rebalanceThreshold: 5,
};

/**
 * Aggressive trading configuration
 */
export const AGGRESSIVE_TRADING_CONFIG: TradingConfiguration = {
  enableAutomaticTrading: true,
  maxPositionSizeSOL: 5.0, // Higher position size
  minTradeAmountSOL: 0.1,
  slippageTolerance: 1.0, // Higher slippage tolerance
  minConfidenceThreshold: 60, // Lower confidence requirement
  maxRiskScore: 8, // Higher risk tolerance
  delayBetweenTradesMs: 1000, // Faster execution
  portfolioUpdateIntervalMs: 6 * 60 * 60 * 1000, // 6 hours (frequent but reasonable)
  computeUnitPrice: 50000, // Lower compute unit price
  emergencyStopEnabled: true,
  maxDailyLossPercentage: 25,
  rebalanceThreshold: 10, // Less frequent rebalancing
};

/**
 * Load trading configuration from environment variables
 */
export function loadTradingConfigFromEnv(): TradingConfiguration {
  const config: TradingConfiguration = {
    enableAutomaticTrading: process.env.ENABLE_AUTOMATIC_TRADING === 'true',
    maxPositionSizeSOL: parseFloat(process.env.MAX_POSITION_SIZE_SOL || '1.0'),
    minTradeAmountSOL: parseFloat(process.env.MIN_TRADE_AMOUNT_SOL || '0.01'),
    slippageTolerance: parseFloat(process.env.SLIPPAGE_TOLERANCE || '0.5'),
    minConfidenceThreshold: parseInt(process.env.MIN_CONFIDENCE_THRESHOLD || '70'),
    maxRiskScore: parseInt(process.env.MAX_RISK_SCORE || '5'),
    delayBetweenTradesMs: parseInt(process.env.DELAY_BETWEEN_TRADES_MS || '2000'),
    portfolioUpdateIntervalMs: parseInt(process.env.PORTFOLIO_UPDATE_INTERVAL_MS || (24 * 60 * 60 * 1000).toString()),
    computeUnitPrice: parseInt(process.env.COMPUTE_UNIT_PRICE || '100000'),
    emergencyStopEnabled: process.env.EMERGENCY_STOP_ENABLED !== 'false',
    maxDailyLossPercentage: parseFloat(process.env.MAX_DAILY_LOSS_PERCENTAGE || '10'),
    rebalanceThreshold: parseFloat(process.env.REBALANCE_THRESHOLD || '5'),
  };

  // Validate configuration
  validateTradingConfig(config);

  return config;
}

/**
 * Get predefined trading configuration by risk profile
 */
export function getTradingConfigByRiskProfile(riskLevel: RiskLevel): TradingConfiguration {
  switch (riskLevel) {
    case 'conservative':
      return { ...CONSERVATIVE_TRADING_CONFIG };
    case 'moderate':
      return { ...MODERATE_TRADING_CONFIG };
    case 'aggressive':
      return { ...AGGRESSIVE_TRADING_CONFIG };
    default:
      return { ...DEFAULT_TRADING_CONFIG };
  }
}

/**
 * Validate trading configuration
 */
export function validateTradingConfig(config: TradingConfiguration): void {
  const errors: string[] = [];

  // Validate position sizes
  if (config.maxPositionSizeSOL <= 0) {
    errors.push('Max position size must be greater than 0');
  }

  if (config.minTradeAmountSOL <= 0) {
    errors.push('Min trade amount must be greater than 0');
  }

  if (config.minTradeAmountSOL > config.maxPositionSizeSOL) {
    errors.push('Min trade amount cannot be greater than max position size');
  }

  // Validate percentages
  if (config.slippageTolerance < 0 || config.slippageTolerance > 10) {
    errors.push('Slippage tolerance must be between 0 and 10%');
  }

  if (config.minConfidenceThreshold < 0 || config.minConfidenceThreshold > 100) {
    errors.push('Min confidence threshold must be between 0 and 100%');
  }

  if (config.maxRiskScore < 0 || config.maxRiskScore > 10) {
    errors.push('Max risk score must be between 0 and 10');
  }

  if (config.maxDailyLossPercentage < 0 || config.maxDailyLossPercentage > 100) {
    errors.push('Max daily loss percentage must be between 0 and 100%');
  }

  if (config.rebalanceThreshold < 0 || config.rebalanceThreshold > 50) {
    errors.push('Rebalance threshold must be between 0 and 50%');
  }

  // Validate delays
  if (config.delayBetweenTradesMs < 0) {
    errors.push('Delay between trades must be non-negative');
  }

  // Validate compute unit price
  if (config.computeUnitPrice < 0) {
    errors.push('Compute unit price must be non-negative');
  }

  if (errors.length > 0) {
    throw new Error(`Invalid trading configuration: ${errors.join(', ')}`);
  }
}

/**
 * Create a safe trading configuration for testing
 */
export function createTestTradingConfig(): TradingConfiguration {
  return {
    enableAutomaticTrading: false, // Always disabled for testing
    maxPositionSizeSOL: 0.01, // Very small amounts for testing
    minTradeAmountSOL: 0.001,
    slippageTolerance: 0.1,
    minConfidenceThreshold: 95, // Very high confidence for testing
    maxRiskScore: 1, // Very low risk for testing
    delayBetweenTradesMs: 10000, // Long delays for testing
    portfolioUpdateIntervalMs: 60 * 60 * 1000, // 1 hour for testing
    computeUnitPrice: 200000, // Higher priority for testing
    emergencyStopEnabled: true,
    maxDailyLossPercentage: 1, // Very low loss limit for testing
    rebalanceThreshold: 1,
  };
}

/**
 * Display trading configuration in human-readable format
 */
export function displayTradingConfig(config: TradingConfiguration): string {
  return `
🔧 Trading Configuration:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 Automatic Trading: ${config.enableAutomaticTrading ? 'ENABLED' : 'DISABLED'}
💰 Max Position Size: ${config.maxPositionSizeSOL} SOL
💵 Min Trade Amount: ${config.minTradeAmountSOL} SOL
📊 Slippage Tolerance: ${config.slippageTolerance}%
📈 Min Confidence: ${config.minConfidenceThreshold}%
⚠️  Max Risk Score: ${config.maxRiskScore}/10
⏱️  Trade Delay: ${config.delayBetweenTradesMs}ms
⏰ Portfolio Update: ${Math.round(config.portfolioUpdateIntervalMs / (60 * 60 * 1000))}h
🔥 Compute Unit Price: ${config.computeUnitPrice}
🚨 Emergency Stop: ${config.emergencyStopEnabled ? 'ENABLED' : 'DISABLED'}
📉 Max Daily Loss: ${config.maxDailyLossPercentage}%
🔄 Rebalance Threshold: ${config.rebalanceThreshold}%
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;
}

/**
 * Get environment variables template for trading configuration
 */
export function getTradingConfigEnvTemplate(): string {
  return `
# Trading Configuration Environment Variables
# Copy these to your .env file and modify as needed

# Enable/disable automatic trading (DANGER: Only enable if you understand the risks)
ENABLE_AUTOMATIC_TRADING=false

# Position and trade size limits
MAX_POSITION_SIZE_SOL=1.0
MIN_TRADE_AMOUNT_SOL=0.01

# Risk management
SLIPPAGE_TOLERANCE=0.5
MIN_CONFIDENCE_THRESHOLD=70
MAX_RISK_SCORE=5
MAX_DAILY_LOSS_PERCENTAGE=10

# Execution settings
DELAY_BETWEEN_TRADES_MS=2000
PORTFOLIO_UPDATE_INTERVAL_MS=86400000
COMPUTE_UNIT_PRICE=100000
REBALANCE_THRESHOLD=5

# Safety settings
EMERGENCY_STOP_ENABLED=true
`;
}
