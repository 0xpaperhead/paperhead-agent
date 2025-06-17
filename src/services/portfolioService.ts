import { TrendingTokensService } from "./trendingTokensService.js";
import { TrendAnalyzer } from "./trendAnalyzer.js";
import { 
  Portfolio, 
  PortfolioToken, 
  PortfolioAnalysis, 
  TrendingToken,
  FearGreedAnalysis,
  SentimentData
} from "../types/index.js";

export class PortfolioService {
  private trendingTokensService: TrendingTokensService;
  private trendAnalyzer: TrendAnalyzer;

  constructor(trendingTokensService: TrendingTokensService, trendAnalyzer: TrendAnalyzer) {
    this.trendingTokensService = trendingTokensService;
    this.trendAnalyzer = trendAnalyzer;
  }

  /**
   * Generate an equal allocation portfolio based on comprehensive sentiment analysis
   */
  async generateEqualAllocationPortfolio(
    numberOfTokens: number = 5,
    riskProfile: 'conservative' | 'moderate' | 'aggressive' = 'moderate'
  ): Promise<PortfolioAnalysis> {
    console.log(`🎯 Generating ${numberOfTokens}-token equal allocation portfolio (${riskProfile} risk)...`);

    // Gather all market data
    const [trendingTokens, marketAnalysis] = await Promise.all([
      this.trendingTokensService.fetchTrendingTokens(),
      this.trendingTokensService.getMarketAnalysis()
    ]);

    // Get current market sentiment data
    const sentimentTrend = this.trendAnalyzer.getSentimentTrend();
    const fearGreedTrend = this.trendAnalyzer.getFearGreedTrend();
    const topTrendingTopics = this.trendAnalyzer.getTopTrendingTopics(10);
    const stats = this.trendAnalyzer.getSummaryStats();

    // Filter and score tokens based on risk profile
    const scoredTokens = await this.scoreTokensForPortfolio(trendingTokens, riskProfile);

    // Select top tokens
    const selectedTokens = this.selectTopTokens(scoredTokens, numberOfTokens, riskProfile);

    // Create equal allocation portfolio
    const allocation = 100 / numberOfTokens;
    const portfolioTokens: PortfolioToken[] = selectedTokens.map(tokenData => ({
      symbol: tokenData.token.token.symbol,
      mint: tokenData.token.token.mint,
      name: tokenData.token.token.name,
      allocation: allocation,
      reasoning: tokenData.reasoning,
      sentimentScore: tokenData.sentimentScore,
      riskScore: tokenData.token.risk.score,
      momentumScore: tokenData.momentumScore,
      confidence: tokenData.confidence
    }));

    // Create portfolio
    const portfolio: Portfolio = {
      id: `portfolio_${Date.now()}`,
      name: `Equal Weight ${riskProfile.charAt(0).toUpperCase() + riskProfile.slice(1)} Portfolio`,
      description: `AI-generated equal allocation portfolio based on comprehensive sentiment analysis`,
      totalAllocation: 100,
      tokens: portfolioTokens,
      metadata: {
        createdAt: Date.now(),
        basedOnData: {
          fearGreedValue: parseInt(fearGreedTrend.current?.today.value || '50'),
          marketSentiment: marketAnalysis.marketSentiment,
          topTrendingTopics: topTrendingTopics.map(t => t.topic),
          totalTokensAnalyzed: trendingTokens.length
        },
        strategy: 'equal_weight',
        riskProfile
      }
    };

    // Analyze the portfolio
    const analysis = this.analyzePortfolio(portfolio, marketAnalysis, fearGreedTrend, sentimentTrend);

    return { portfolio, analysis };
  }

  /**
   * Score tokens for portfolio inclusion based on multiple factors
   */
  private async scoreTokensForPortfolio(
    tokens: TrendingToken[],
    riskProfile: 'conservative' | 'moderate' | 'aggressive'
  ): Promise<Array<{
    token: TrendingToken;
    sentimentScore: number;
    momentumScore: number;
    confidence: number;
    reasoning: string;
  }>> {
    const scoredTokens: Array<{
      token: TrendingToken;
      sentimentScore: number;
      momentumScore: number;
      confidence: number;
      reasoning: string;
    }> = [];

    for (const token of tokens) {
      const analysis = this.trendingTokensService.analyzeTokenOpportunity(token);
      
      // Skip rugged or very high-risk tokens for conservative profiles
      if (riskProfile === 'conservative' && (token.risk.rugged || token.risk.score > 4)) {
        continue;
      }
      
      // Skip extremely high-risk tokens for moderate profiles
      if (riskProfile === 'moderate' && (token.risk.rugged || token.risk.score > 7)) {
        continue;
      }

      // Calculate sentiment score (0-100)
      const sentimentScore = this.calculateSentimentScore(token, analysis);
      
      // Calculate momentum score (0-100)
      const momentumScore = this.calculateMomentumScore(token);
      
      // Calculate overall confidence
      const confidence = this.calculateConfidence(token, analysis, riskProfile);

      // Skip tokens below confidence threshold
      const minConfidence = riskProfile === 'conservative' ? 70 : riskProfile === 'moderate' ? 50 : 30;
      if (confidence < minConfidence) {
        continue;
      }

      // Generate reasoning
      const reasoning = this.generateReasoning(token, analysis, sentimentScore, momentumScore);

      scoredTokens.push({
        token,
        sentimentScore,
        momentumScore,
        confidence,
        reasoning
      });
    }

    return scoredTokens;
  }

  /**
   * Calculate sentiment score based on market conditions and token performance
   */
  private calculateSentimentScore(token: TrendingToken, analysis: any): number {
    let score = 50; // Base score

    // Price momentum contribution
    const priceChange1h = token.events['1h']?.priceChangePercentage || 0;
    const priceChange24h = token.events['24h']?.priceChangePercentage || 0;
    
    if (priceChange1h > 10) score += 15;
    else if (priceChange1h > 5) score += 10;
    else if (priceChange1h < -10) score -= 15;
    else if (priceChange1h < -5) score -= 10;

    if (priceChange24h > 50) score += 20;
    else if (priceChange24h > 20) score += 15;
    else if (priceChange24h < -30) score -= 20;
    else if (priceChange24h < -15) score -= 15;

    // Buy/sell pressure
    const totalTrades = token.buysCount + token.sellsCount;
    if (totalTrades > 0) {
      const buyRatio = token.buysCount / totalTrades;
      if (buyRatio > 0.7) score += 15;
      else if (buyRatio > 0.6) score += 10;
      else if (buyRatio < 0.3) score -= 15;
      else if (buyRatio < 0.4) score -= 10;
    }

    // Liquidity and volume
    const primaryPool = token.pools[0];
    if (primaryPool) {
      if (primaryPool.liquidity.usd > 1000000) score += 10;
      else if (primaryPool.liquidity.usd > 500000) score += 5;
      else if (primaryPool.liquidity.usd < 100000) score -= 10;

      if (primaryPool.txns.volume > 5000000) score += 10;
      else if (primaryPool.txns.volume > 1000000) score += 5;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calculate momentum score based on price changes across timeframes
   */
  private calculateMomentumScore(token: TrendingToken): number {
    let score = 50; // Base score

    const events = token.events;
    
    // Short-term momentum (1h, 5m, 15m)
    const shortTerm = [
      events['5m']?.priceChangePercentage || 0,
      events['15m']?.priceChangePercentage || 0,
      events['1h']?.priceChangePercentage || 0
    ];
    
    const avgShortTerm = shortTerm.reduce((a, b) => a + b, 0) / shortTerm.length;
    if (avgShortTerm > 5) score += 20;
    else if (avgShortTerm > 2) score += 10;
    else if (avgShortTerm < -5) score -= 20;
    else if (avgShortTerm < -2) score -= 10;

    // Medium-term momentum (2h, 4h, 6h)
    const mediumTerm = [
      events['2h']?.priceChangePercentage || 0,
      events['4h']?.priceChangePercentage || 0,
      events['6h']?.priceChangePercentage || 0
    ];
    
    const avgMediumTerm = mediumTerm.reduce((a, b) => a + b, 0) / mediumTerm.length;
    if (avgMediumTerm > 10) score += 15;
    else if (avgMediumTerm > 5) score += 8;
    else if (avgMediumTerm < -10) score -= 15;
    else if (avgMediumTerm < -5) score -= 8;

    // Long-term momentum (12h, 24h)
    const longTerm = [
      events['12h']?.priceChangePercentage || 0,
      events['24h']?.priceChangePercentage || 0
    ];
    
    const avgLongTerm = longTerm.reduce((a, b) => a + b, 0) / longTerm.length;
    if (avgLongTerm > 20) score += 15;
    else if (avgLongTerm > 10) score += 8;
    else if (avgLongTerm < -20) score -= 15;
    else if (avgLongTerm < -10) score -= 8;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calculate confidence score
   */
  private calculateConfidence(token: TrendingToken, analysis: any, riskProfile: string): number {
    let confidence = analysis.score; // Start with token opportunity score

    // Risk adjustments
    if (token.risk.rugged) confidence = 0;
    if (token.risk.score > 8) confidence -= 30;
    else if (token.risk.score > 6) confidence -= 20;
    else if (token.risk.score > 4) confidence -= 10;
    else if (token.risk.score < 3) confidence += 10;

    // Liquidity adjustments
    const primaryPool = token.pools[0];
    if (primaryPool) {
      if (primaryPool.liquidity.usd < 50000) confidence -= 20;
      else if (primaryPool.liquidity.usd > 1000000) confidence += 10;
      
      // LP burn
      if (primaryPool.lpBurn === 100) confidence += 10;
      else if (primaryPool.lpBurn < 50) confidence -= 10;
    }

    // Authority checks
    if (primaryPool && !primaryPool.security.mintAuthority && !primaryPool.security.freezeAuthority) {
      confidence += 10;
    }

    // Profile-specific adjustments
    if (riskProfile === 'conservative') {
      confidence -= Math.max(0, (token.risk.score - 2) * 5);
    } else if (riskProfile === 'aggressive') {
      confidence += Math.min(10, token.risk.score * 2);
    }

    return Math.max(0, Math.min(100, confidence));
  }

  /**
   * Generate reasoning for token selection
   */
  private generateReasoning(token: TrendingToken, analysis: any, sentimentScore: number, momentumScore: number): string {
    const reasons = [];
    
    const priceChange1h = token.events['1h']?.priceChangePercentage || 0;
    const priceChange24h = token.events['24h']?.priceChangePercentage || 0;
    
    if (priceChange1h > 10) reasons.push(`Strong 1h momentum (+${priceChange1h.toFixed(1)}%)`);
    if (priceChange24h > 50) reasons.push(`Explosive 24h growth (+${priceChange24h.toFixed(1)}%)`);
    
    if (token.risk.score <= 3) reasons.push(`Low risk score (${token.risk.score}/10)`);
    
    const totalTrades = token.buysCount + token.sellsCount;
    if (totalTrades > 0) {
      const buyRatio = token.buysCount / totalTrades;
      if (buyRatio > 0.6) reasons.push(`Strong buy pressure (${(buyRatio * 100).toFixed(0)}% buys)`);
    }
    
    const primaryPool = token.pools[0];
    if (primaryPool) {
      if (primaryPool.liquidity.usd > 500000) {
        reasons.push(`High liquidity ($${(primaryPool.liquidity.usd / 1000).toFixed(0)}K)`);
      }
      if (primaryPool.lpBurn === 100) reasons.push(`LP 100% burned`);
    }
    
    if (analysis.signals && analysis.signals.length > 0) {
      reasons.push(...analysis.signals.slice(0, 2));
    }
    
    return reasons.slice(0, 4).join(', ') || 'Selected based on overall scoring algorithm';
  }

  /**
   * Select top tokens for portfolio
   */
  private selectTopTokens(
    scoredTokens: Array<{
      token: TrendingToken;
      sentimentScore: number;
      momentumScore: number;
      confidence: number;
      reasoning: string;
    }>,
    numberOfTokens: number,
    riskProfile: string
  ): Array<{
    token: TrendingToken;
    sentimentScore: number;
    momentumScore: number;
    confidence: number;
    reasoning: string;
  }> {
    // Sort by composite score (weighted average of different factors)
    const sorted = scoredTokens.sort((a, b) => {
      const scoreA = this.calculateCompositeScore(a, riskProfile);
      const scoreB = this.calculateCompositeScore(b, riskProfile);
      return scoreB - scoreA;
    });

    // Ensure some diversification by avoiding too many similar tokens
    const selected: Array<{
      token: TrendingToken;
      sentimentScore: number;
      momentumScore: number;
      confidence: number;
      reasoning: string;
    }> = [];
    const usedSymbolPrefixes = new Set<string>();
    
    for (const tokenData of sorted) {
      if (selected.length >= numberOfTokens) break;
      
      const symbol = tokenData.token.token.symbol;
      const prefix = symbol.substring(0, 3).toUpperCase();
      
      // Allow some similar tokens but not too many
      const similarCount = Array.from(usedSymbolPrefixes).filter(p => p === prefix).length;
      if (similarCount < 2) {
        selected.push(tokenData);
        usedSymbolPrefixes.add(prefix);
      }
    }
    
    // If we don't have enough, fill remaining spots
    if (selected.length < numberOfTokens) {
      const remaining = sorted.filter(t => !selected.includes(t));
      selected.push(...remaining.slice(0, numberOfTokens - selected.length));
    }

    return selected;
  }

  /**
   * Calculate composite score for ranking
   */
  private calculateCompositeScore(tokenData: {
    token: TrendingToken;
    sentimentScore: number;
    momentumScore: number;
    confidence: number;
    reasoning: string;
  }, riskProfile: string): number {
    const { sentimentScore, momentumScore, confidence } = tokenData;
    const riskScore = tokenData.token.risk.score;
    
    let composite = 0;
    
    if (riskProfile === 'conservative') {
      // Prioritize low risk and confidence
      composite = (confidence * 0.4) + (sentimentScore * 0.3) + (momentumScore * 0.2) + ((10 - riskScore) * 0.1 * 10);
    } else if (riskProfile === 'moderate') {
      // Balanced approach
      composite = (confidence * 0.3) + (sentimentScore * 0.3) + (momentumScore * 0.3) + ((10 - riskScore) * 0.1 * 5);
    } else { // aggressive
      // Prioritize momentum and sentiment over safety
      composite = (momentumScore * 0.4) + (sentimentScore * 0.3) + (confidence * 0.2) + ((10 - riskScore) * 0.1 * 2);
    }
    
    return composite;
  }

  /**
   * Analyze the created portfolio
   */
  private analyzePortfolio(
    portfolio: Portfolio,
    marketAnalysis: any,
    fearGreedTrend: any,
    sentimentTrend: any
  ): any {
    const tokens = portfolio.tokens;
    
    // Calculate averages
    const averageRiskScore = tokens.reduce((sum, t) => sum + t.riskScore, 0) / tokens.length;
    const averageMomentumScore = tokens.reduce((sum, t) => sum + t.momentumScore, 0) / tokens.length;
    const averageSentimentScore = tokens.reduce((sum, t) => sum + t.sentimentScore, 0) / tokens.length;
    
    // Diversification score (based on symbol diversity and allocation evenness)
    const diversificationScore = this.calculateDiversificationScore(tokens);
    
    // Market alignment score
    const marketAlignmentScore = this.calculateMarketAlignmentScore(
      portfolio,
      marketAnalysis,
      fearGreedTrend,
      sentimentTrend
    );
    
    // Generate warnings and strengths
    const warnings = this.generateWarnings(portfolio, averageRiskScore, marketAnalysis);
    const strengths = this.generateStrengths(portfolio, averageMomentumScore, averageSentimentScore);
    
    // Recommend action
    const recommendedAction = this.recommendAction(marketAlignmentScore, averageRiskScore, marketAnalysis);
    
    return {
      averageRiskScore: Math.round(averageRiskScore * 10) / 10,
      averageMomentumScore: Math.round(averageMomentumScore * 10) / 10,
      averageSentimentScore: Math.round(averageSentimentScore * 10) / 10,
      diversificationScore: Math.round(diversificationScore * 10) / 10,
      marketAlignmentScore: Math.round(marketAlignmentScore * 10) / 10,
      recommendedAction,
      warnings,
      strengths
    };
  }

  /**
   * Calculate diversification score
   */
  private calculateDiversificationScore(tokens: PortfolioToken[]): number {
    // Check symbol diversity
    const uniquePrefixes = new Set(tokens.map(t => t.symbol.substring(0, 3)));
    const prefixDiversity = (uniquePrefixes.size / tokens.length) * 100;
    
    // Check allocation evenness (for equal weight, should be perfect)
    const expectedAllocation = 100 / tokens.length;
    const allocationVariance = tokens.reduce((sum, t) => {
      return sum + Math.abs(t.allocation - expectedAllocation);
    }, 0) / tokens.length;
    
    const allocationScore = Math.max(0, 100 - (allocationVariance * 10));
    
    return (prefixDiversity + allocationScore) / 2;
  }

  /**
   * Calculate market alignment score
   */
  private calculateMarketAlignmentScore(
    portfolio: Portfolio,
    marketAnalysis: any,
    fearGreedTrend: any,
    sentimentTrend: any
  ): number {
    let score = 50; // Base score
    
    // Align with market sentiment
    if (marketAnalysis.marketSentiment === 'bullish') {
      score += 20;
    } else if (marketAnalysis.marketSentiment === 'bearish') {
      score -= 20;
    }
    
    // Align with Fear & Greed
    const fearGreedValue = parseInt(fearGreedTrend.current?.today.value || '50');
    if (fearGreedValue < 25 && portfolio.metadata.riskProfile === 'aggressive') {
      score += 15; // Contrarian play in extreme fear
    } else if (fearGreedValue > 75 && portfolio.metadata.riskProfile === 'conservative') {
      score += 10; // Conservative approach in greed
    }
    
    // Align with overall sentiment trend
    const positiveSentiment = sentimentTrend.current?.percentages.positive || 50;
    if (positiveSentiment > 60) {
      score += 10;
    } else if (positiveSentiment < 40) {
      score -= 10;
    }
    
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Generate portfolio warnings
   */
  private generateWarnings(portfolio: Portfolio, averageRiskScore: number, marketAnalysis: any): string[] {
    const warnings = [];
    
    if (averageRiskScore > 6) {
      warnings.push('High average risk score - consider more conservative tokens');
    }
    
    if (marketAnalysis.marketSentiment === 'bearish') {
      warnings.push('Current market sentiment is bearish - timing may not be optimal');
    }
    
    const highRiskTokens = portfolio.tokens.filter(t => t.riskScore > 7);
    if (highRiskTokens.length > 0) {
      warnings.push(`${highRiskTokens.length} tokens have high risk scores (>7/10)`);
    }
    
    const lowConfidenceTokens = portfolio.tokens.filter(t => t.confidence < 60);
    if (lowConfidenceTokens.length > 0) {
      warnings.push(`${lowConfidenceTokens.length} tokens have low confidence scores (<60%)`);
    }
    
    return warnings;
  }

  /**
   * Generate portfolio strengths
   */
  private generateStrengths(portfolio: Portfolio, averageMomentumScore: number, averageSentimentScore: number): string[] {
    const strengths = [];
    
    if (averageMomentumScore > 70) {
      strengths.push('Strong momentum across selected tokens');
    }
    
    if (averageSentimentScore > 70) {
      strengths.push('Positive sentiment indicators for most tokens');
    }
    
    const lowRiskTokens = portfolio.tokens.filter(t => t.riskScore < 4);
    if (lowRiskTokens.length >= portfolio.tokens.length / 2) {
      strengths.push('Majority of tokens have low risk scores');
    }
    
    const highConfidenceTokens = portfolio.tokens.filter(t => t.confidence > 80);
    if (highConfidenceTokens.length > 0) {
      strengths.push(`${highConfidenceTokens.length} tokens have high confidence scores (>80%)`);
    }
    
    strengths.push('Equal allocation provides balanced exposure and risk distribution');
    
    return strengths;
  }

  /**
   * Recommend action based on analysis
   */
  private recommendAction(marketAlignmentScore: number, averageRiskScore: number, marketAnalysis: any): 'build' | 'wait' | 'adjust' {
    if (marketAlignmentScore > 70 && averageRiskScore < 5) {
      return 'build';
    } else if (marketAnalysis.marketSentiment === 'bearish' || averageRiskScore > 7) {
      return 'wait';
    } else {
      return 'adjust';
    }
  }
} 