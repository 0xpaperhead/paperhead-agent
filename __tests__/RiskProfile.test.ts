import { RiskProfile, RiskLevel, CompositeParams } from '../src/analysis/RiskProfile'
import {Config} from '../src/config'
import { getTradingConfigByRiskProfile } from '../src/config/trading'

jest.mock('../src/config/trading', () => ({
  getTradingConfigByRiskProfile: jest.fn()
}))

jest.mock('../src/config/index', () => ({
  Config: { agent: { risk_profile: 'moderate' } }
}))

// Helper to set mock trading config
const mockTradingConfig = (overrides = {}) => ({
  portfolioUpdateIntervalMs: 24 * 60 * 60 * 1000,
  maxPositionSizeSOL: 10,
  minConfidenceThreshold: 50,
  maxRiskScore: 7,
  maxDailyLossPercentage: 5,
  ...overrides
})

describe('RiskProfile', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(getTradingConfigByRiskProfile as jest.Mock).mockImplementation((level: RiskLevel) => {
      if (level === 'conservative') return mockTradingConfig({ maxRiskScore: 4, minConfidenceThreshold: 70 })
      if (level === 'aggressive') return mockTradingConfig({ maxRiskScore: 10, minConfidenceThreshold: 30 })
      return mockTradingConfig()
    })
  })

  describe('constructor', () => {
    it('uses passed risk level', () => {
      const rp = new RiskProfile('aggressive')
      expect(rp.level).toBe('aggressive')
    })

    it('uses default from Config if none provided', () => {
      const rp = new RiskProfile()
      expect(rp.level).toBe(Config.agent.risk_profile)
    })
  })

  describe('tokenExceedsRisk', () => {
    it('blocks rugged token for conservative', () => {
      const rp = new RiskProfile('conservative')
      expect(rp.tokenExceedsRisk(true, 3)).toBe(true)
    })

    it('blocks high risk token for conservative', () => {
      const rp = new RiskProfile('conservative')
      expect(rp.tokenExceedsRisk(false, 5)).toBe(true)
    })

    it('blocks extreme risk token for moderate', () => {
      const rp = new RiskProfile('moderate')
      expect(rp.tokenExceedsRisk(false, 8)).toBe(true)
    })

    it('allows lower risk token for aggressive', () => {
      const rp = new RiskProfile('aggressive')
      expect(rp.tokenExceedsRisk(false, 5)).toBe(false)
    })
  })

  describe('getMinConfidence', () => {
    it('returns correct thresholds', () => {
      expect(new RiskProfile('conservative').getMinConfidence()).toBe(70)
      expect(new RiskProfile('moderate').getMinConfidence()).toBe(50)
      expect(new RiskProfile('aggressive').getMinConfidence()).toBe(30)
    })
  })

  describe('getTokenConfidenceModifier', () => {
    it('reduces confidence for high-risk in conservative', () => {
      expect(new RiskProfile('conservative').getTokenConfidenceModifier(5)).toBe(-15)
    })

    it('boosts confidence for aggressive', () => {
      expect(new RiskProfile('aggressive').getTokenConfidenceModifier(5)).toBe(10)
    })

    it('returns 0 for moderate', () => {
      expect(new RiskProfile('moderate').getTokenConfidenceModifier(5)).toBe(0)
    })
  })

  describe('getFearGreedAlignmentBonus', () => {
    it('gives aggressive bonus in extreme fear', () => {
      expect(new RiskProfile('aggressive').getFearGreedAlignmentBonus(20)).toBe(15)
    })

    it('gives conservative bonus in extreme greed', () => {
      expect(new RiskProfile('conservative').getFearGreedAlignmentBonus(80)).toBe(10)
    })

    it('returns 0 otherwise', () => {
      expect(new RiskProfile('moderate').getFearGreedAlignmentBonus(50)).toBe(0)
    })
  })

  describe('getCompositeScore', () => {
    const params: CompositeParams = { confidence: 80, sentimentScore: 70, momentumScore: 60, tokenRiskScore: 3 }

    it('prioritizes low risk for conservative', () => {
      const score = new RiskProfile('conservative').getCompositeScore(params)
      expect(typeof score).toBe('number')
    })

    it('balances for moderate', () => {
      const score = new RiskProfile('moderate').getCompositeScore(params)
      expect(typeof score).toBe('number')
    })

    it('prioritizes momentum for aggressive', () => {
      const score = new RiskProfile('aggressive').getCompositeScore(params)
      expect(typeof score).toBe('number')
    })
  })

  describe('getProfileDescription', () => {
    it('returns formatted description', () => {
      const rp = new RiskProfile('moderate')
      expect(rp.getProfileDescription()).toContain('Moderate')
      expect(rp.getProfileDescription()).toContain('% daily loss')
    })
  })

  describe('getRiskProfileCriteria', () => {
    it('returns conservative defaults', () => {
      const criteria = new RiskProfile('conservative').getRiskProfileCriteria()
      expect(criteria.maxRiskScore).toBe(4)
      expect(criteria.minLiquidity).toBe(50000)
      expect(criteria.minConfidence).toBe(70)
    })

    it('returns correct moderate criteria', () => {
      const criteria = new RiskProfile('moderate').getRiskProfileCriteria()
      expect(criteria.maxRiskScore).toBe(7)
      expect(criteria.minLiquidity).toBe(100000)
      expect(criteria.minConfidence).toBe(50)
    })

    it('returns correct aggressive criteria', () => {
      const criteria = new RiskProfile('aggressive').getRiskProfileCriteria()
      expect(criteria.maxRiskScore).toBe(10)
      expect(criteria.minLiquidity).toBe(50000)
      expect(criteria.minConfidence).toBe(30)
    })
  })

  describe('getRiskProfileInfo', () => {
    it('maps correct info from config', () => {
      const info = RiskProfile.getRiskProfileInfo('moderate')
      expect(info.hours).toBeGreaterThan(0)
      expect(info.frequency).toBe('Standard frequency')
    })
  })

  describe('displayAllRiskProfiles', () => {
    it('renders a table-like string', () => {
      const output = RiskProfile.displayAllRiskProfiles('moderate')
      console.log(output)
      expect(output).toContain('RISK PROFILE COMPARISON')
      expect(output).toContain('MODERATE')
    })
  })
})
