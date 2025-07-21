import { Config } from "../config/index.js";

// Twitter API Response Interfaces
export interface TwitterUser {
  id: string;
  name: string;
  username: string;
  description: string;
  followers_count: number;
  following_count: number;
  tweet_count: number;
  verified: boolean;
  profile_image_url: string;
  created_at: string;
}

export interface TwitterUserResponse {
  data: TwitterUser;
}

export interface Tweet {
  id: string;
  text: string;
  created_at: string;
  author_id: string;
  public_metrics: {
    retweet_count: number;
    like_count: number;
    reply_count: number;
    quote_count: number;
  };
  lang?: string;
  context_annotations?: Array<{
    domain: {
      id: string;
      name: string;
      description: string;
    };
    entity: {
      id: string;
      name: string;
      description: string;
    };
  }>;
}

export interface TwitterTweetsResponse {
  data: Tweet[];
  meta: {
    result_count: number;
    next_token?: string;
  };
}

// Analysis Response Interfaces
export interface TokenMention {
  token: string;
  symbol: string;
  mentionCount: number;
  sentiment: 'positive' | 'neutral' | 'negative';
  sentimentScore: number; // -1 to 1
  tweets: Tweet[];
  lastMentioned: string;
}

export interface TwitterMindshareAnalysis {
  totalTweets: number;
  totalEngagement: number;
  averageEngagement: number;
  sentimentDistribution: {
    positive: number;
    neutral: number;
    negative: number;
  };
  topInfluencers: Array<{
    username: string;
    followerCount: number;
    tweetCount: number;
    avgEngagement: number;
  }>;
  timeRange: {
    from: string;
    to: string;
  };
}

export interface TwitterTopic {
  topic: string;
  relevanceScore: number;
  tweetCount: number;
  relatedKeywords: string[];
  sentiment: 'positive' | 'neutral' | 'negative';
  trendingStrength: number; // 0-100
}

export interface TwitterAnalysisResult {
  tokenMentions: TokenMention[];
  mindshareAnalysis: TwitterMindshareAnalysis;
  topics: TwitterTopic[];
  generatedAt: number;
  analysisMetadata: {
    usersAnalyzed: number;
    totalTweets: number;
    timeframe: string;
    confidence: number;
  };
}

export class TwitterService {
  private readonly baseUrl = "https://twitter241.p.rapidapi.com";
  private readonly headers = {
    'X-RapidAPI-Key': Config.rapidApi.apiKey,
    'X-RapidAPI-Host': 'twitter241.p.rapidapi.com'
  };

  /**
   * Fetch user details by username
   */
  private async fetchUserByUsername(username: string): Promise<TwitterUser | null> {
    try {
      const url = `${this.baseUrl}/user?username=${encodeURIComponent(username)}`;
      
      console.log(`👤 Fetching user details for: @${username}`);

      const response = await fetch(url, {
        method: 'GET',
        headers: this.headers
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: TwitterUserResponse = await response.json();
      
      if (!data.data) {
        console.warn(`⚠️ User @${username} not found`);
        return null;
      }

      console.log(`✅ User @${username} found - ${data.data.followers_count} followers`);
      return data.data;

    } catch (error) {
      console.error(`❌ Error fetching user @${username}:`, error);
      return null;
    }
  }

  /**
   * Fetch tweets for a specific user using their rest_id
   */
  private async fetchUserTweets(userId: string, username: string, limit: number = 20): Promise<Tweet[]> {
    try {
      const url = `${this.baseUrl}/user-tweets?user=${encodeURIComponent(userId)}&count=${limit}`;
      
      console.log(`🐦 Fetching ${limit} tweets for @${username} (ID: ${userId})`);

      const response = await fetch(url, {
        method: 'GET',
        headers: this.headers
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: TwitterTweetsResponse = await response.json();
      const tweets = data.data || [];

      console.log(`✅ Found ${tweets.length} tweets for @${username}`);
      return tweets;

    } catch (error) {
      console.error(`❌ Error fetching tweets for @${username}:`, error);
      return [];
    }
  }

  /**
   * Batch fetch user data and tweets for multiple usernames in parallel
   */
  private async batchFetchTwitterData(usernames: string[], tweetsPerUser: number = 20): Promise<Map<string, { user: TwitterUser; tweets: Tweet[] }>> {
    console.log(`🚀 Parallel fetching Twitter data for ${usernames.length} users...`);

    // First, get all user details in parallel
    const userPromises = usernames.map(async (username) => {
      const user = await this.fetchUserByUsername(username);
      return { username, user };
    });

    const userResults = await Promise.allSettled(userPromises);
    const validUsers: Array<{ username: string; user: TwitterUser }> = [];

    userResults.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value.user) {
        validUsers.push({
          username: result.value.username,
          user: result.value.user
        });
      } else {
        console.error(`❌ Failed to fetch user ${usernames[index]}`);
      }
    });

    console.log(`👥 Found ${validUsers.length}/${usernames.length} valid users`);

    // Then, fetch tweets for all valid users in parallel
    const tweetPromises = validUsers.map(async ({ username, user }) => {
      const tweets = await this.fetchUserTweets(user.id, username, tweetsPerUser);
      return { username, user, tweets };
    });

    const tweetResults = await Promise.allSettled(tweetPromises);
    const userData = new Map<string, { user: TwitterUser; tweets: Tweet[] }>();

    tweetResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        const { username, user, tweets } = result.value;
        userData.set(username, { user, tweets });
      } else {
        console.error(`❌ Failed to fetch tweets for ${validUsers[index].username}:`, result.reason);
      }
    });

    console.log(`✅ Successfully fetched data for ${userData.size} users`);
    return userData;
  }

  /**
   * Extract token mentions from tweets using pattern matching
   */
  private extractTokenMentions(tweets: Tweet[]): Map<string, TokenMention> {
    const tokenMentions = new Map<string, TokenMention>();
    
    // Common patterns for crypto tokens
    const tokenPatterns = [
      /\$([A-Z]{2,10})\b/g, // $SOL, $BTC, etc.
      /\b([A-Z]{2,10})\/USD\b/g, // SOL/USD, BTC/USD
      /\b(bitcoin|ethereum|solana|cardano|polygon|avalanche|fantom|arbitrum)\b/gi,
      /\b(btc|eth|sol|ada|matic|avax|ftm|arb)\b/gi
    ];

    tweets.forEach(tweet => {
      tokenPatterns.forEach(pattern => {
        const matches = tweet.text.matchAll(pattern);
        for (const match of matches) {
          const token = match[1]?.toUpperCase() || match[0].replace('$', '').toUpperCase();
          
          if (!tokenMentions.has(token)) {
            tokenMentions.set(token, {
              token,
              symbol: token,
              mentionCount: 0,
              sentiment: 'neutral',
              sentimentScore: 0,
              tweets: [],
              lastMentioned: tweet.created_at
            });
          }

          const mention = tokenMentions.get(token)!;
          mention.mentionCount++;
          mention.tweets.push(tweet);
          
          // Update last mentioned if this tweet is newer
          if (new Date(tweet.created_at) > new Date(mention.lastMentioned)) {
            mention.lastMentioned = tweet.created_at;
          }
        }
      });
    });

    return tokenMentions;
  }

  /**
   * Analyze sentiment using simple keyword-based approach
   */
  private analyzeSentiment(text: string): { sentiment: 'positive' | 'neutral' | 'negative'; score: number } {
    const positiveWords = ['bullish', 'moon', 'pump', 'buy', 'hodl', 'diamond', 'rocket', 'ath', 'breakout', 'rally'];
    const negativeWords = ['bearish', 'dump', 'crash', 'sell', 'rip', 'dead', 'scam', 'rug', 'fud', 'dip'];
    
    const lowercaseText = text.toLowerCase();
    let positiveCount = 0;
    let negativeCount = 0;

    positiveWords.forEach(word => {
      if (lowercaseText.includes(word)) positiveCount++;
    });

    negativeWords.forEach(word => {
      if (lowercaseText.includes(word)) negativeCount++;
    });

    const totalSentimentWords = positiveCount + negativeCount;
    if (totalSentimentWords === 0) {
      return { sentiment: 'neutral', score: 0 };
    }

    const score = (positiveCount - negativeCount) / totalSentimentWords;
    
    if (score > 0.2) return { sentiment: 'positive', score };
    if (score < -0.2) return { sentiment: 'negative', score };
    return { sentiment: 'neutral', score };
  }

  /**
   * Generate topics from tweet content using keyword extraction
   */
  private generateTopics(tweets: Tweet[]): TwitterTopic[] {
    const topicKeywords = new Map<string, { count: number; sentiment: number; tweets: Tweet[] }>();
    
    // Extract hashtags and keywords
    tweets.forEach(tweet => {
      const sentiment = this.analyzeSentiment(tweet.text);
      
      // Extract hashtags
      const hashtags = tweet.text.match(/#\w+/g) || [];
      hashtags.forEach(hashtag => {
        const topic = hashtag.toLowerCase();
        if (!topicKeywords.has(topic)) {
          topicKeywords.set(topic, { count: 0, sentiment: 0, tweets: [] });
        }
        const data = topicKeywords.get(topic)!;
        data.count++;
        data.sentiment += sentiment.score;
        data.tweets.push(tweet);
      });

      // Extract context annotations if available
      if (tweet.context_annotations) {
        tweet.context_annotations.forEach(annotation => {
          const topic = annotation.entity.name.toLowerCase();
          if (!topicKeywords.has(topic)) {
            topicKeywords.set(topic, { count: 0, sentiment: 0, tweets: [] });
          }
          const data = topicKeywords.get(topic)!;
          data.count++;
          data.sentiment += sentiment.score;
          data.tweets.push(tweet);
        });
      }
    });

    // Convert to TwitterTopic array and sort by relevance
    const topics: TwitterTopic[] = Array.from(topicKeywords.entries())
      .map(([topic, data]) => ({
        topic,
        relevanceScore: Math.min(data.count * 10, 100), // Cap at 100
        tweetCount: data.count,
        relatedKeywords: [], // Could be enhanced with related keyword extraction
        sentiment: data.sentiment > 0.1 ? 'positive' as const : data.sentiment < -0.1 ? 'negative' as const : 'neutral' as const,
        trendingStrength: Math.min((data.count / tweets.length) * 100, 100)
      }))
      .filter(topic => topic.tweetCount >= 2) // Only include topics mentioned multiple times
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 20); // Top 20 topics

    return topics;
  }

  /**
   * Main method: Analyze Twitter data for given usernames
   */
  async analyzeTwitterData(usernames: string[], tweetsPerUser: number = 20): Promise<TwitterAnalysisResult> {
    console.log(`🔍 Starting Twitter analysis for ${usernames.length} users...`);
    
    const startTime = Date.now();
    
    // Fetch all Twitter data
    const userData = await this.batchFetchTwitterData(usernames, tweetsPerUser);
    
    // Compile all tweets
    const allTweets: Tweet[] = [];
    const userStats: Array<{ username: string; followerCount: number; tweetCount: number; avgEngagement: number }> = [];
    
    userData.forEach(({ user, tweets }, username) => {
      allTweets.push(...tweets);
      
      const avgEngagement = tweets.reduce((sum, tweet) => 
        sum + tweet.public_metrics.like_count + tweet.public_metrics.retweet_count, 0
      ) / tweets.length || 0;
      
      userStats.push({
        username,
        followerCount: user.followers_count,
        tweetCount: tweets.length,
        avgEngagement
      });
    });

    console.log(`📊 Analyzing ${allTweets.length} total tweets...`);

    // Extract token mentions and analyze sentiment
    const tokenMentionsMap = this.extractTokenMentions(allTweets);
    const tokenMentions: TokenMention[] = Array.from(tokenMentionsMap.values())
      .map(mention => {
        // Analyze sentiment for each token based on its tweets
        const sentiments = mention.tweets.map(tweet => this.analyzeSentiment(tweet.text));
        const avgSentiment = sentiments.reduce((sum, s) => sum + s.score, 0) / sentiments.length;
        
        return {
          ...mention,
          sentiment: avgSentiment > 0.1 ? 'positive' as const : avgSentiment < -0.1 ? 'negative' as const : 'neutral' as const,
          sentimentScore: avgSentiment
        };
      })
      .sort((a, b) => b.mentionCount - a.mentionCount);

    // Generate topics
    const topics = this.generateTopics(allTweets);

    // Calculate overall sentiment distribution
    const allSentiments = allTweets.map(tweet => this.analyzeSentiment(tweet.text));
    const sentimentDistribution = {
      positive: allSentiments.filter(s => s.sentiment === 'positive').length,
      neutral: allSentiments.filter(s => s.sentiment === 'neutral').length,
      negative: allSentiments.filter(s => s.sentiment === 'negative').length
    };

    // Calculate mindshare analysis
    const totalEngagement = allTweets.reduce((sum, tweet) => 
      sum + tweet.public_metrics.like_count + tweet.public_metrics.retweet_count + 
      tweet.public_metrics.reply_count + tweet.public_metrics.quote_count, 0
    );

    const mindshareAnalysis: TwitterMindshareAnalysis = {
      totalTweets: allTweets.length,
      totalEngagement,
      averageEngagement: totalEngagement / allTweets.length || 0,
      sentimentDistribution,
      topInfluencers: userStats.sort((a, b) => b.followerCount - a.followerCount).slice(0, 5),
      timeRange: {
        from: allTweets.length > 0 ? allTweets.reduce((oldest, tweet) => 
          new Date(tweet.created_at) < new Date(oldest.created_at) ? tweet : oldest
        ).created_at : new Date().toISOString(),
        to: allTweets.length > 0 ? allTweets.reduce((newest, tweet) => 
          new Date(tweet.created_at) > new Date(newest.created_at) ? tweet : newest
        ).created_at : new Date().toISOString()
      }
    };

    const analysisResult: TwitterAnalysisResult = {
      tokenMentions,
      mindshareAnalysis,
      topics,
      generatedAt: Date.now(),
      analysisMetadata: {
        usersAnalyzed: userData.size,
        totalTweets: allTweets.length,
        timeframe: `${tweetsPerUser} tweets per user`,
        confidence: Math.min(allTweets.length / (usernames.length * tweetsPerUser) * 100, 100)
      }
    };

    const executionTime = Date.now() - startTime;
    console.log(`✅ Twitter analysis completed in ${executionTime}ms`);
    console.log(`📈 Found ${tokenMentions.length} token mentions and ${topics.length} topics`);

    return analysisResult;
  }
}