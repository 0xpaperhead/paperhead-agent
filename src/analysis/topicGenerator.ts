import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";

export class TopicGenerator {
  private readonly baseTopics = [
    // Core Solana - single words work best for API
    'solana',
    'sol',
    'jupiter',
    'orca',
    'raydium',
    'serum',
    'mango',
    'drift',
    'solend',
    'tulip',
    'marinade',
    'lido',
    'jito',
    'sanctum',
    
    // Solana NFT & Gaming
    'magic',
    'tensor',
    'solanart',
    'metaplex',
    'candy',
    'atlas',
    'aurory',
    'genopets',
    'stepn',
    'degenerate',
    'bears',
    
    // Solana Memecoins & Popular Tokens
    'bonk',
    'dogwifhat',
    'wif',
    'popcat',
    'book',
    'jup',
    'wen',
    'myro',
    'slerf',
    'smog',
    'pump',
    'moonshot',
    
    // Solana Infrastructure & Tools
    'phantom',
    'solflare',
    'backpack',
    'glow',
    'solscan',
    'dexscreener',
    'birdeye',
    'helius',
    'quicknode',
    'triton',
    'validators',
    'staking',
    
    // Solana DeFi Concepts
    'yield',
    'liquidity',
    'perpetuals',
    'options',
    'lending',
    'borrowing',
    'restaking',
    
    // Solana Development & Ecosystem
    'anchor',
    'mobile',
    'saga',
    'pay',
    'actions',
    'blinks',
    'compressed',
    'compression',
    'hackathon',
    
    // Solana RWA & Enterprise
    'rwa',
    'assets',
    'enterprise',
    'institutional',
    'etf',
    'adoption',
    
    // Cross-chain but Solana-focused
    'wormhole',
    'allbridge',
    'portal',
    'bridge'
  ];

  private dynamicTopics: string[] = [];
  private lastTopicUpdate = 0;
  private readonly updateInterval = 6 * 60 * 60 * 1000; // 6 hours

  // Zod schema for structured topic extraction
  private readonly topicExtractionSchema = z.object({
    topics: z.array(z.string().min(2).max(50)).max(15).describe("Array of Solana-related single-word keywords and project names extracted from headlines")
  });

  /**
   * Use LLM agent to extract Solana-related single-word keywords from headlines
   */
  private async extractTopicsWithAgent(headlines: string[]): Promise<string[]> {
    try {
      const headlinesText = headlines.slice(0, 50).join('\n'); // Limit to 50 headlines to avoid token limits
      
      const prompt = `You are a Solana ecosystem expert. Analyze these crypto news headlines and extract ONLY Solana-related single-word keywords and project names.

HEADLINES:
${headlinesText}

INSTRUCTIONS:
1. Extract only SINGLE WORDS related to the Solana blockchain ecosystem
2. Include: Solana project names, token symbols, protocol names (single words only)
3. Examples: "jupiter", "orca", "bonk", "phantom", "magic", "solana", "jup", "drift"
4. Exclude: Multi-word phrases, Bitcoin/Ethereum terms, generic crypto words
5. Return terms in lowercase
6. Focus on trending/frequently mentioned single-word terms
7. Maximum 15 single-word keywords

Extract single-word Solana keywords from these headlines.`;

      const { object } = await generateObject({
        model: openai('gpt-4o-mini'),
        schema: this.topicExtractionSchema,
        prompt,
        system: 'You are a Solana blockchain expert who identifies trending single-word Solana keywords from news headlines. Return only single words, no phrases.',
        temperature: 0.3,
        maxTokens: 500
      });

      const extractedTopics = object.topics.filter(topic => 
        typeof topic === 'string' && 
        topic.length > 2 && 
        topic.length < 50 &&
        !topic.includes(' ') // Ensure single words only
      );

      console.log(`🤖 Agent extracted ${extractedTopics.length} Solana keywords:`, extractedTopics);
      return extractedTopics;

    } catch (error) {
      console.error('❌ Error in agent topic extraction:', error);
      return this.fallbackTopicExtraction(headlines);
    }
  }

  /**
   * Fallback method for topic extraction when agent fails
   */
  private fallbackTopicExtraction(headlines: string[]): string[] {
    const potentialTopics: string[] = [];
    const solanaCryptoTerms = [
      'solana', 'sol', 'spl', 'jupiter', 'orca', 'raydium', 'serum', 'phantom', 'magic',
      'bonk', 'jup', 'drift', 'mango', 'marinade', 'jito', 'tensor', 'metaplex',
      'pump', 'moonshot', 'stepn', 'atlas', 'aurory', 'genopets',
      'anchor', 'solscan', 'birdeye', 'dexscreener', 'helius', 'quicknode',
      'saga', 'mobile', 'pay', 'compressed', 'blinks', 'wif', 'popcat'
    ];

    headlines.forEach(headline => {
      const words = headline.toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 2);

      // Look for Solana-specific single-word terms
      words.forEach(word => {
        if (solanaCryptoTerms.includes(word) ||
            word.includes('sol') ||
            word.includes('spl') ||
            (word.endsWith('coin') && word.length < 10) ||
            (word.endsWith('token') && word.length < 12) ||
            word.startsWith('$')) {
          const cleanWord = word.replace('$', '').replace(/coin$/, '').replace(/token$/, '');
          if (cleanWord.length > 2) {
            potentialTopics.push(cleanWord);
          }
        }
      });
    });

    // Return unique topics that appear multiple times (indicating trend)
    const topicCounts = potentialTopics.reduce((acc, topic) => {
      acc[topic] = (acc[topic] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(topicCounts)
      .filter(([_, count]) => count >= 2) // Must appear at least twice
      .sort(([_, a], [__, b]) => b - a) // Sort by frequency
      .slice(0, 10) // Take top 10
      .map(([topic]) => topic);
  }

  /**
   * Get all available topics (base + dynamic)
   */
  getAllTopics(): string[] {
    return [...this.baseTopics, ...this.dynamicTopics];
  }

  /**
   * Get a subset of topics for analysis (to avoid API rate limits)
   */
  getTopicsForAnalysis(count: number = 20): string[] {
    const allTopics = this.getAllTopics();
    
    // Shuffle and take the first 'count' topics
    const shuffled = [...allTopics].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }

  /**
   * Get high-priority topics that should always be analyzed
   */
  getHighPriorityTopics(): string[] {
    return [
      'solana',
      'sol',
      'jupiter',
      'orca',
      'raydium',
      'bonk',
      'jup',
      'magic',
      'phantom',
      'pump',
      'marinade',
      'jito',
      'drift',
      'mango',
      'wif'
    ];
  }

  /**
   * Add dynamic topics based on trending keywords
   */
  addDynamicTopics(topics: string[]): void {
    // Filter to single words only and ensure they're not already in base topics
    const newTopics = topics.filter(topic => 
      !topic.includes(' ') && // Single words only
      !this.baseTopics.includes(topic.toLowerCase()) &&
      !this.dynamicTopics.includes(topic.toLowerCase()) &&
      topic.length > 2 &&
      topic.length < 20
    );

    this.dynamicTopics.push(...newTopics.map(t => t.toLowerCase()));
    this.lastTopicUpdate = Date.now();

    if (newTopics.length > 0) {
      console.log(`🔥 Added ${newTopics.length} new dynamic keywords:`, newTopics);
    }
  }

  /**
   * Extract potential topics from news headlines using AI agent
   */
  async extractTopicsFromHeadlines(headlines: string[]): Promise<string[]> {
    console.log(`🤖 Using AI agent to extract Solana keywords from ${headlines.length} headlines...`);
    return await this.extractTopicsWithAgent(headlines);
  }

  /**
   * Clean up old dynamic topics
   */
  cleanupDynamicTopics(): void {
    const now = Date.now();
    if (now - this.lastTopicUpdate > this.updateInterval) {
      // Keep only the most recent dynamic topics
      this.dynamicTopics = this.dynamicTopics.slice(-20);
      console.log(`🧹 Cleaned up dynamic topics, keeping ${this.dynamicTopics.length} recent ones`);
    }
  }

  /**
   * Get topics categorized by type (returns single-word keywords)
   */
  getCategorizedTopics(): {
    defi: string[];
    memecoins: string[];
    infrastructure: string[];
    gaming: string[];
    nft: string[];
    tools: string[];
    general: string[];
  } {
    const allTopics = this.getAllTopics();
    
    return {
      defi: allTopics.filter(t => 
        ['jupiter', 'orca', 'raydium', 'serum', 'mango', 'drift', 'solend', 'tulip', 
         'marinade', 'lido', 'jito', 'sanctum', 'yield', 'liquidity', 'perpetuals', 
         'options', 'lending', 'borrowing', 'staking', 'restaking'].includes(t)
      ),
      memecoins: allTopics.filter(t => 
        ['bonk', 'dogwifhat', 'wif', 'popcat', 'book', 'wen', 'myro', 'slerf', 'smog', 
         'pump', 'moonshot'].includes(t)
      ),
      infrastructure: allTopics.filter(t => 
        ['solana', 'sol', 'validators', 'staking', 'helius', 'quicknode', 'triton', 
         'anchor', 'wormhole', 'allbridge', 'portal', 'bridge'].includes(t)
      ),
      gaming: allTopics.filter(t => 
        ['atlas', 'aurory', 'genopets', 'stepn'].includes(t)
      ),
      nft: allTopics.filter(t => 
        ['magic', 'tensor', 'solanart', 'metaplex', 'candy', 'degenerate', 'bears', 
         'compressed', 'compression'].includes(t)
      ),
      tools: allTopics.filter(t => 
        ['phantom', 'solflare', 'backpack', 'glow', 'solscan', 'dexscreener', 
         'birdeye', 'mobile', 'saga', 'pay', 'actions', 'blinks'].includes(t)
      ),
      general: allTopics.filter(t => 
        !['jupiter', 'orca', 'raydium', 'serum', 'mango', 'drift', 'solend', 'tulip', 
          'marinade', 'lido', 'jito', 'sanctum', 'yield', 'liquidity', 'perpetuals', 
          'options', 'lending', 'borrowing', 'staking', 'restaking',
          'bonk', 'dogwifhat', 'wif', 'popcat', 'book', 'wen', 'myro', 'slerf', 'smog', 
          'pump', 'moonshot',
          'solana', 'sol', 'validators', 'staking', 'helius', 'quicknode', 'triton', 
          'anchor', 'wormhole', 'allbridge', 'portal', 'bridge',
          'atlas', 'aurory', 'genopets', 'stepn',
          'magic', 'tensor', 'solanart', 'metaplex', 'candy', 'degenerate', 'bears', 
          'compressed', 'compression',
          'phantom', 'solflare', 'backpack', 'glow', 'solscan', 'dexscreener', 
          'birdeye', 'mobile', 'saga', 'pay', 'actions', 'blinks'].includes(t)
      )
    };
  }
} 