import { Config } from "../libs/config.js";
import { TrendingToken, TrendingTokensResponse, PriceEvents } from "../types/index.js";

export class TrendingTokensService {
  private readonly baseUrl = "https://data.solanatracker.io";
  private readonly apiKey: string;
  private cache: TrendingTokensResponse | null = null;
  private cacheExpiry: number = 0;
  private readonly cacheTimeout = 5 * 60 * 1000; // 5 minutes cache

  constructor() {
    this.apiKey = Config.solanaTracker.apiKey;
  }

  /**
   * Fetch trending tokens from Solana Tracker API
   */
  async fetchTrendingTokens(): Promise<TrendingToken[]> {
    try {
      // Return cached data if still valid
      if (this.cache && Date.now() < this.cacheExpiry) {
        console.log("📦 Using cached trending tokens data");
        return this.cache.tokens;
      }

      console.log("🚀 Fetching trending tokens from Solana Tracker...");

      const response = await fetch(`${this.baseUrl}/tokens/trending`, {
        method: 'GET',
        headers: {
          'x-api-key': this.apiKey,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Solana Tracker API error: ${response.status} ${response.statusText}`);
      }

      const data: TrendingToken[] = await response.json();

      // Cache the response
      this.cache = {
        tokens: data,
        fetchedAt: Date.now()
      };
      this.cacheExpiry = Date.now() + this.cacheTimeout;

      console.log(`✅ Fetched ${data.length} trending tokens`);
      return data;

    } catch (error) {
      console.error("❌ Error fetching trending tokens:", error);
      // Return cached data if available, even if expired
      if (this.cache) {
        console.log("⚠️ Returning expired cached data due to API error");
        return this.cache.tokens;
      }
      return [];
    }
  }

  /**
   * Get top trending tokens by price momentum
   */
  async getTopMomentumTokens(limit: number = 10, timeframe: keyof PriceEvents = '1h'): Promise<TrendingToken[]> {
    const tokens = await this.fetchTrendingTokens();
    
    return tokens
      .filter(token => token.events[timeframe]?.priceChangePercentage !== undefined)
      .sort((a, b) => {
        const aChange = a.events[timeframe]?.priceChangePercentage || 0;
        const bChange = b.events[timeframe]?.priceChangePercentage || 0;
        return bChange - aChange; // Descending order
      })
      .slice(0, limit);
  }

  /**
   * Get tokens with highest buy pressure
   */
  async getHighBuyPressureTokens(limit: number = 10): Promise<TrendingToken[]> {
    const tokens = await this.fetchTrendingTokens();
    
    return tokens
      .filter(token => token.buysCount > 0 && token.sellsCount > 0)
      .sort((a, b) => {
        const aBuyRatio = a.buysCount / (a.buysCount + a.sellsCount);
        const bBuyRatio = b.buysCount / (b.buysCount + b.sellsCount);
        return bBuyRatio - aBuyRatio;
      })
      .slice(0, limit);
  }

  /**
   * Get low-risk trending tokens
   */
  async getLowRiskTrendingTokens(limit: number = 10, maxRiskScore: number = 3): Promise<TrendingToken[]> {
    const tokens = await this.fetchTrendingTokens();
    
    return tokens
      .filter(token => !token.risk.rugged && token.risk.score <= maxRiskScore)
      .filter(token => token.events['1h']?.priceChangePercentage && token.events['1h'].priceChangePercentage > 0)
      .sort((a, b) => {
        const aChange = a.events['1h']?.priceChangePercentage || 0;
        const bChange = b.events['1h']?.priceChangePercentage || 0;
        return bChange - aChange;
      })
      .slice(0, limit);
  }

  /**
   * Get tokens with high liquidity and volume
   */
  async getHighLiquidityTokens(limit: number = 10, minLiquidityUSD: number = 100000): Promise<TrendingToken[]> {
    const tokens = await this.fetchTrendingTokens();
    
    return tokens
      .filter(token => {
        const primaryPool = token.pools[0];
        return primaryPool && primaryPool.liquidity.usd >= minLiquidityUSD;
      })
      .sort((a, b) => {
        const aLiquidity = a.pools[0]?.liquidity.usd || 0;
        const bLiquidity = b.pools[0]?.liquidity.usd || 0;
        return bLiquidity - aLiquidity;
      })
      .slice(0, limit);
  }

  /**
   * Analyze token for trading opportunities
   */
  analyzeTokenOpportunity(token: TrendingToken): {
    score: number;
    signals: string[];
    risks: string[];
    recommendation: 'strong_buy' | 'buy' | 'hold' | 'avoid';
  } {
    const signals: string[] = [];
    const risks: string[] = [];
    let score = 50; // Base score

    const primaryPool = token.pools[0];
    if (!primaryPool) {
      return { score: 0, signals, risks: ['No liquidity pool found'], recommendation: 'avoid' };
    }

    // Price momentum analysis
    const priceChanges = token.events;
    if (priceChanges['1h']?.priceChangePercentage && priceChanges['1h'].priceChangePercentage > 20) {
      signals.push(`Strong 1h momentum: +${priceChanges['1h'].priceChangePercentage.toFixed(1)}%`);
      score += 15;
    }
    if (priceChanges['24h']?.priceChangePercentage && priceChanges['24h'].priceChangePercentage > 100) {
      signals.push(`Explosive 24h growth: +${priceChanges['24h'].priceChangePercentage.toFixed(1)}%`);
      score += 20;
    }

    // Buy pressure analysis
    const totalTrades = token.buysCount + token.sellsCount;
    if (totalTrades > 0) {
      const buyRatio = token.buysCount / totalTrades;
      if (buyRatio > 0.6) {
        signals.push(`High buy pressure: ${(buyRatio * 100).toFixed(1)}% buys`);
        score += 10;
      } else if (buyRatio < 0.4) {
        risks.push(`High sell pressure: ${((1 - buyRatio) * 100).toFixed(1)}% sells`);
        score -= 10;
      }
    }

    // Liquidity analysis
    if (primaryPool.liquidity.usd > 500000) {
      signals.push(`High liquidity: $${(primaryPool.liquidity.usd / 1000).toFixed(0)}K`);
      score += 10;
    } else if (primaryPool.liquidity.usd < 50000) {
      risks.push(`Low liquidity: $${(primaryPool.liquidity.usd / 1000).toFixed(0)}K`);
      score -= 15;
    }

    // Risk assessment
    if (token.risk.rugged) {
      risks.push('Token flagged as rugged');
      score -= 50;
    }
    
    if (token.risk.score > 7) {
      risks.push(`High risk score: ${token.risk.score}/10`);
      score -= 20;
    } else if (token.risk.score < 3) {
      signals.push(`Low risk score: ${token.risk.score}/10`);
      score += 10;
    }

    // LP burn analysis
    if (primaryPool.lpBurn === 100) {
      signals.push('LP tokens 100% burned');
      score += 15;
    } else if (primaryPool.lpBurn < 50) {
      risks.push(`LP tokens not burned: ${primaryPool.lpBurn}%`);
      score -= 10;
    }

    // Authority analysis
    if (!primaryPool.security.mintAuthority && !primaryPool.security.freezeAuthority) {
      signals.push('Mint and freeze authority renounced');
      score += 10;
    } else {
      if (primaryPool.security.mintAuthority) {
        risks.push('Mint authority not renounced');
        score -= 5;
      }
      if (primaryPool.security.freezeAuthority) {
        risks.push('Freeze authority not renounced');
        score -= 5;
      }
    }

    // Volume analysis
    if (primaryPool.txns.volume > 1000000) {
      signals.push(`High volume: $${(primaryPool.txns.volume / 1000000).toFixed(1)}M`);
      score += 15;
    }

    // Determine recommendation
    let recommendation: 'strong_buy' | 'buy' | 'hold' | 'avoid';
    if (score >= 80) recommendation = 'strong_buy';
    else if (score >= 65) recommendation = 'buy';
    else if (score >= 40) recommendation = 'hold';
    else recommendation = 'avoid';

    return { score, signals, risks, recommendation };
  }

  /**
   * Get comprehensive market analysis
   */
  async getMarketAnalysis(): Promise<{
    totalTokens: number;
    averageRiskScore: number;
    topPerformers: TrendingToken[];
    riskDistribution: { [key: string]: number };
    volumeLeaders: TrendingToken[];
    marketSentiment: 'bullish' | 'bearish' | 'neutral';
  }> {
    const tokens = await this.fetchTrendingTokens();
    
    const totalTokens = tokens.length;
    const averageRiskScore = tokens.reduce((sum, token) => sum + token.risk.score, 0) / totalTokens;
    
    // Risk distribution
    const riskDistribution = {
      low: tokens.filter(t => t.risk.score <= 3).length,
      medium: tokens.filter(t => t.risk.score > 3 && t.risk.score <= 6).length,
      high: tokens.filter(t => t.risk.score > 6).length,
    };

    // Top performers (1h)
    const topPerformers = tokens
      .filter(t => t.events['1h']?.priceChangePercentage !== undefined)
      .sort((a, b) => (b.events['1h']?.priceChangePercentage || 0) - (a.events['1h']?.priceChangePercentage || 0))
      .slice(0, 5);

    // Volume leaders
    const volumeLeaders = tokens
      .filter(t => t.pools[0]?.txns.volume !== undefined)
      .sort((a, b) => (b.pools[0]?.txns.volume || 0) - (a.pools[0]?.txns.volume || 0))
      .slice(0, 5);

    // Market sentiment based on buy/sell ratios
    const totalBuys = tokens.reduce((sum, token) => sum + token.buysCount, 0);
    const totalSells = tokens.reduce((sum, token) => sum + token.sellsCount, 0);
    const buyRatio = totalBuys / (totalBuys + totalSells);
    
    let marketSentiment: 'bullish' | 'bearish' | 'neutral';
    if (buyRatio > 0.55) marketSentiment = 'bullish';
    else if (buyRatio < 0.45) marketSentiment = 'bearish';
    else marketSentiment = 'neutral';

    return {
      totalTokens,
      averageRiskScore,
      topPerformers,
      riskDistribution,
      volumeLeaders,
      marketSentiment
    };
  }

  /**
   * Find tokens by symbol or name
   */
  async findTokens(query: string): Promise<TrendingToken[]> {
    const tokens = await this.fetchTrendingTokens();
    const lowerQuery = query.toLowerCase();
    
    return tokens.filter(token => 
      token.token.symbol.toLowerCase().includes(lowerQuery) ||
      token.token.name.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Get fresh data (bypass cache)
   */
  async refreshData(): Promise<TrendingToken[]> {
    this.cache = null;
    this.cacheExpiry = 0;
    return this.fetchTrendingTokens();
  }
} 