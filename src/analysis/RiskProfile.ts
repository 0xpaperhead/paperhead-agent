import { TradingConfiguration } from '../types/index.js'
import { getTradingConfigByRiskProfile } from '../config/trading.js'
import { Config } from '../config/index.js'

export type RiskLevel = 'conservative' | 'moderate' | 'aggressive'

export interface RiskProfileInfo {
  hours: number
  frequency: string
  description: string
  maxPositionSize: number
  minConfidence: number
  maxRiskScore: number
  maxDailyLoss: number
}

export interface CompositeParams {
  confidence: number
  sentimentScore: number
  momentumScore: number
  tokenRiskScore: number
}

export class RiskProfile {
  level: RiskLevel
  tradingConfig: TradingConfiguration
  riskProfileInfo: RiskProfileInfo

  constructor(level?: RiskLevel) {
    // use default from config if not specified
    if (level) {
      this.level = level
    } else {
      this.level = Config.agent.risk_profile as RiskLevel
    }
    this.tradingConfig = getTradingConfigByRiskProfile(this.level)
    this.riskProfileInfo = RiskProfile.getRiskProfileInfo(this.level)
  }

  /**
   * Determines if a token should be excluded based on the current risk profile's tolerance.
   *
   * @param tokenIsRugged - Whether the token has been flagged as potentially rugged
   * @param tokenRiskScore - The token's risk score (0-10, higher is riskier)
   * @returns boolean - True if the token exceeds this risk profile's risk tolerance
   *
   */
  tokenExceedsRisk(tokenIsRugged: boolean, tokenRiskScore: number): boolean {
    // Skip rugged or very high-risk tokens for conservative profiles
    if (this.level === 'conservative' && (tokenIsRugged || tokenRiskScore > 4)) {
      return true
    }

    // Skip extremely high-risk tokens for moderate profiles
    if (this.level === 'moderate' && (tokenIsRugged || tokenRiskScore > 7)) {
      return true
    }
    return false
  }
  /**
   * Returns the minimum confidence threshold required for trading based on risk profile.
   * Higher confidence thresholds are required for more conservative profiles.
   *
   * @returns Minimum confidence percentage (30-70) required to consider a trade
   *   - Conservative: 70 (most selective)
   *   - Moderate: 50
   *   - Aggressive: 30 (least selective)
   */
  getMinConfidence(): number {
    return this.level === 'conservative' ? 70 : this.level === 'moderate' ? 50 : 30
  }

  /**
   * Calculates a confidence adjustment based on the token's risk score and current risk profile.
   *
   * For conservative profiles: Applies a negative adjustment for higher risk tokens
   * For aggressive profiles: Applies a positive adjustment for higher risk tokens
   * For moderate profiles: Returns 0 (no adjustment)
   *
   * @param tokenRiskScore - The token's risk score (0-10, higher is riskier)
   * @returns number - The confidence modifier to apply
   */
  getTokenConfidenceModifier(tokenRiskScore: number): number {
    if (this.level === 'conservative') {
      return -Math.max(0, (tokenRiskScore - 2) * 5)
    } else if (this.level === 'aggressive') {
      return Math.min(10, tokenRiskScore * 2)
    }
    return 0
  }

  /**
   * Calculates a market alignment bonus based on the current fear/greed index.
   * Aggressive profiles get a bonus in extreme fear (contrarian play)
   * Conservative profiles get a bonus in extreme greed (cautious approach)
   *
   * @param fearGreedValue - Current fear/greed index (0-100)
   * @returns number - The alignment bonus to apply
   */
  getFearGreedAlignmentBonus(fearGreedValue: number): number {
    if (this.level === 'aggressive' && fearGreedValue < 25) {
      return 15 // Contrarian play in extreme fear
    }
    if (this.level === 'conservative' && fearGreedValue > 75) {
      return 10 // Conservative approach in greed
    }
    return 0
  }

  /**
   * Calculates a weighted composite score based on the risk profile and input parameters.
   * The scoring weights vary by risk profile to prioritize different factors
   *
   * @param params - Object containing scoring components (0-100 scale)
   * @returns Composite score (0-100) representing overall trade desirability
   */
  getCompositeScore(params: CompositeParams): number {
    const { confidence, sentimentScore, momentumScore, tokenRiskScore } = params
    let composite = 0
    if (this.level === 'conservative') {
      // Prioritize low risk and confidence
      composite = confidence * 0.4 + sentimentScore * 0.3 + momentumScore * 0.2 + (10 - tokenRiskScore) * 0.1 * 10
    } else if (this.level === 'moderate') {
      // Balanced approach
      composite = confidence * 0.3 + sentimentScore * 0.3 + momentumScore * 0.3 + (10 - tokenRiskScore) * 0.1 * 5
    } else {
      // aggressive
      // Prioritize momentum and sentiment over safety
      composite = momentumScore * 0.4 + sentimentScore * 0.3 + confidence * 0.2 + (10 - tokenRiskScore) * 0.1 * 2
    }
    return composite
  }

  /**
   * Generates a human-readable description of the risk profile
   * @returns A string summarizing the risk profile
   */
  getProfileDescription(): string {
    return `${
      this.level.charAt(0).toUpperCase() + this.level.slice(1)
    } (${this.riskProfileInfo.frequency.toLowerCase()}, max ${this.riskProfileInfo.maxDailyLoss}% daily loss)`
  }

  /**
   * Generates a set of risk profile criteria as an object
   * with the following properties:
   * - maxRiskScore: maximum risk score allowed for trading
   * - minLiquidity: minimum liquidity required for trading
   * - minConfidence: minimum confidence required for trading
   * @returns An object with risk profile criteria
   */
  getRiskProfileCriteria() {
    let maxRiskScore = 10
    let minLiquidity = 50000 // Default for conservative
    let minConfidence = 30 // Default for conservative

    if (this.level === 'moderate') {
      maxRiskScore = 7
      minLiquidity = 100000
      minConfidence = 50
    } else if (this.level === 'aggressive') {
      maxRiskScore = 4
      minLiquidity = 50000
      minConfidence = 30
    }

    return {
      maxRiskScore,
      minLiquidity,
      minConfidence,
    }
  }

  /**
   * Get comprehensive risk profile information from trading configurations
   * This is the single source of truth for risk profile characteristics
   */
  static getRiskProfileInfo(level: RiskLevel): RiskProfileInfo {
    const frequencyMap = {
      conservative: 'Low frequency',
      moderate: 'Standard frequency',
      aggressive: 'High frequency',
    }

    const descriptionMap = {
      conservative: 'Safer tokens, higher liquidity requirements, updates every 48h',
      moderate: 'Balanced risk/reward, standard approach, updates every 24h',
      aggressive: 'Higher risk tolerance, volatile tokens, updates every 6h',
      live: 'Live trading, no updates',
    }

    const config = getTradingConfigByRiskProfile(level)

    return {
      hours: Math.round(config.portfolioUpdateIntervalMs / (60 * 60 * 1000)),
      frequency: frequencyMap[level],
      description: descriptionMap[level],
      maxPositionSize: config.maxPositionSizeSOL,
      minConfidence: config.minConfidenceThreshold,
      maxRiskScore: config.maxRiskScore,
      maxDailyLoss: config.maxDailyLossPercentage,
    }
  }

  // unused helper method
  static displayAllRiskProfiles(defaultProfile: RiskLevel = Config.agent.risk_profile as RiskLevel): string {
    const riskLevels: RiskLevel[] = ['conservative', 'moderate', 'aggressive']
    let output = '\n🎯 RISK PROFILE COMPARISON (Single Source of Truth)\n'
    output += '━'.repeat(80) + '\n'

    riskLevels.forEach(level => {
      const data = RiskProfile.getRiskProfileInfo(level)
      const isDefault = defaultProfile === level
      const marker = isDefault ? '👉 ' : '   '

      output += `${marker}${level.toUpperCase()}:\n`
      output += `     ⏰ Update Interval: ${data.hours} hours (${data.frequency.toLowerCase()})\n`
      output += `     💰 Max Position: ${data.maxPositionSize} SOL\n`
      output += `     📈 Min Confidence: ${data.minConfidence}%\n`
      output += `     ⚠️  Max Risk Score: ${data.maxRiskScore}/10\n`
      output += `     📉 Max Daily Loss: ${data.maxDailyLoss}%\n`
      output += `     💭 ${data.description}\n\n`
    })

    output += '━'.repeat(80) + '\n'
    output += '💡 All values come from src/config/trading.ts configurations\n'

    return output
  }
}
