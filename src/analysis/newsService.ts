import { Config } from "../config/index.js";
import { NewsArticle, SentimentData, TopicScore, FearGreedResponse, FearGreedAnalysis } from "../types/index.js";

export class NewsService {
  private readonly baseUrl = "https://crypto-news51.p.rapidapi.com/api/v1/crypto";
  private readonly fearGreedUrl = "https://crypto-fear-greed-index2.p.rapidapi.com";
  private readonly headers = {
    'X-RapidAPI-Key': Config.rapidApi.apiKey,
    'X-RapidAPI-Host': 'crypto-news51.p.rapidapi.com'
  };
  private readonly fearGreedHeaders = {
    'X-RapidAPI-Key': Config.rapidApi.apiKey,
    'X-RapidAPI-Host': 'crypto-fear-greed-index2.p.rapidapi.com'
  };

  /**
   * Fetch news articles for a specific topic
   */
  async fetchTopicNews(topic: string, limit: number = 100): Promise<NewsArticle[]> {
    try {
      // Topics are already single words, use directly
      const url = `${this.baseUrl}/articles/search?title_keywords=${encodeURIComponent(topic)}&page=1&limit=${limit}&time_frame=24h&format=json`;
      
      console.log(`📰 Fetching news for topic: "${topic}"`);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: this.headers
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();      
      // Use the API response directly since ArticlesResponse = NewsArticle
      const articles: NewsArticle[] = data || [];

      console.log(`✅ Found ${articles.length} articles for ${topic}`);
      return articles;

    } catch (error) {
      console.error(`❌ Error fetching news for ${topic}:`, error);
      return [];
    }
  }

  /**
   * Batch fetch news articles for multiple topics in parallel
   */
  async batchFetchTopicNews(topics: string[], limit: number = 100): Promise<Map<string, NewsArticle[]>> {
    console.log(`🚀 Parallel fetching news for ${topics.length} topics...`);
    
    const promises = topics.map(async (topic) => {
      const articles = await this.fetchTopicNews(topic, limit);
      return { topic, articles };
    });

    const results = await Promise.allSettled(promises);
    const topicArticlesMap = new Map<string, NewsArticle[]>();

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        topicArticlesMap.set(result.value.topic, result.value.articles);
      } else {
        console.error(`❌ Failed to fetch news for ${topics[index]}:`, result.reason);
        topicArticlesMap.set(topics[index], []);
      }
    });

    console.log(`✅ Parallel fetch completed for ${topicArticlesMap.size} topics`);
    return topicArticlesMap;
  }

  /**
   * Fetch overall crypto sentiment data
   */
  async fetchSentiment(interval: '24h' | '48h' = '24h'): Promise<SentimentData | null> {
    try {
      const url = `${this.baseUrl}/sentiment?interval=${interval}`;
      
      console.log(`📊 Fetching ${interval} sentiment data`);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: this.headers
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      console.log(`✅ Sentiment data received for ${interval}`);
      console.log('📈 Sentiment details:', {
        interval: data.interval,
        total: data.total,
        counts: {
          positive: data.counts?.positive || 0,
          neutral: data.counts?.neutral || 0,
          negative: data.counts?.negative || 0
        },
        percentages: {
          positive: data.percentages?.positive || 0,
          neutral: data.percentages?.neutral || 0,
          negative: data.percentages?.negative || 0
        }
      });
      return data as SentimentData;

    } catch (error) {
      console.error(`❌ Error fetching sentiment data:`, error);
      return null;
    }
  }

  /**
   * Batch fetch sentiment data for multiple intervals in parallel
   */
  async batchFetchSentiment(intervals: ('24h' | '48h')[]): Promise<Map<string, SentimentData | null>> {
    console.log(`🚀 Parallel fetching sentiment data for ${intervals.length} intervals...`);
    
    const promises = intervals.map(async (interval) => {
      const sentiment = await this.fetchSentiment(interval);
      return { interval, sentiment };
    });

    const results = await Promise.allSettled(promises);
    const sentimentMap = new Map<string, SentimentData | null>();

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        sentimentMap.set(result.value.interval, result.value.sentiment);
      } else {
        console.error(`❌ Failed to fetch sentiment for ${intervals[index]}:`, result.reason);
        sentimentMap.set(intervals[index], null);
      }
    });

    console.log(`✅ Parallel sentiment fetch completed for ${sentimentMap.size} intervals`);
    return sentimentMap;
  }

  /**
   * Calculate topic popularity score based on article count
   */
  async calculateTopicScore(topic: string): Promise<TopicScore> {
    const articles = await this.fetchTopicNews(topic);
    const popularityScore = Math.min(articles.length, 100); // Cap at 100
    
    return {
      topic,
      popularityScore,
      articles,
      timestamp: Date.now()
    };
  }

  /**
   * Batch fetch scores for multiple topics in parallel (enhanced)
   */
  async batchCalculateTopicScores(topics: string[]): Promise<TopicScore[]> {
    console.log(`🔄 Calculating scores for ${topics.length} topics in parallel...`);
    console.log('📈 Topics to analyze:', topics);
    
    // Use the batch fetch method for better performance
    const articlesMap = await this.batchFetchTopicNews(topics);
    
    const topicScores: TopicScore[] = [];
    
    articlesMap.forEach((articles, topic) => {
      const popularityScore = Math.min(articles.length, 100); // Cap at 100
      topicScores.push({
        topic,
        popularityScore,
        articles,
        timestamp: Date.now()
      });
    });

    // Sort by popularity score descending
    topicScores.sort((a, b) => b.popularityScore - a.popularityScore);
    
    console.log(`✅ Successfully calculated ${topicScores.length} topic scores`);
    return topicScores;
  }

  /**
   * Fetch Fear and Greed Index data (today and yesterday)
   */
  async fetchFearGreedIndex(): Promise<FearGreedResponse | null> {
    try {
      const url = `${this.fearGreedUrl}/index?limit=2`;
      
      console.log(`😱 Fetching Fear and Greed Index data...`);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: this.fearGreedHeaders
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      console.log(`✅ Fear and Greed Index data received`);
      return data as FearGreedResponse;

    } catch (error) {
      console.error(`❌ Error fetching Fear and Greed Index:`, error);
      return null;
    }
  }

  /**
   * Analyze Fear and Greed Index trend (today vs yesterday)
   */
  analyzeFearGreedTrend(fearGreedData: FearGreedResponse): FearGreedAnalysis | null {
    try {
      const timestamps = Object.keys(fearGreedData).sort((a, b) => parseInt(b) - parseInt(a));
      
      if (timestamps.length < 2) {
        console.error("❌ Insufficient Fear and Greed data for trend analysis");
        return null;
      }

      const todayTimestamp = timestamps[0];
      const yesterdayTimestamp = timestamps[1];
      
      const today = { ...fearGreedData[todayTimestamp], timestamp: todayTimestamp };
      const yesterday = { ...fearGreedData[yesterdayTimestamp], timestamp: yesterdayTimestamp };
      
      const todayValue = parseInt(today.value);
      const yesterdayValue = parseInt(yesterday.value);
      const change = todayValue - yesterdayValue;
      
      let trend: 'increasing' | 'decreasing' | 'stable';
      if (Math.abs(change) <= 2) {
        trend = 'stable';
      } else if (change > 0) {
        trend = 'increasing';
      } else {
        trend = 'decreasing';
      }

      const analysis: FearGreedAnalysis = {
        today,
        yesterday,
        change,
        trend,
        classification: this.getFearGreedClassification(todayValue)
      };

      console.log(`📊 Fear & Greed Analysis:`, {
        today: `${today.value} (${today.value_classification})`,
        yesterday: `${yesterday.value} (${yesterday.value_classification})`,
        change: change > 0 ? `+${change}` : change.toString(),
        trend,
        classification: analysis.classification
      });

      return analysis;

    } catch (error) {
      console.error(`❌ Error analyzing Fear and Greed trend:`, error);
      return null;
    }
  }

  /**
   * Get detailed Fear and Greed classification based on value
   */
  private getFearGreedClassification(value: number): string {
    if (value <= 24) return "Extreme Fear";
    if (value <= 49) return "Fear";
    if (value === 50) return "Neutral";
    if (value <= 74) return "Greed";
    return "Extreme Greed";
  }

  /**
   * Comprehensive parallel data fetch - gets all data needed for analysis including Fear & Greed
   */
  async fetchAllData(topics: string[], sentimentIntervals: ('24h' | '48h')[] = ['24h', '48h']): Promise<{
    topicScores: TopicScore[];
    sentimentData: Map<string, SentimentData | null>;
    fearGreedAnalysis: FearGreedAnalysis | null;
  }> {
    console.log(`🚀 Starting comprehensive parallel data fetch...`);
    console.log(`📊 Fetching data for ${topics.length} topics, ${sentimentIntervals.length} sentiment intervals, and Fear & Greed Index`);
    
    // Execute all fetches in parallel
    const [topicScores, sentimentData, fearGreedData] = await Promise.all([
      this.batchCalculateTopicScores(topics),
      this.batchFetchSentiment(sentimentIntervals),
      this.fetchFearGreedIndex()
    ]);

    // Analyze Fear & Greed trend
    const fearGreedAnalysis = fearGreedData ? this.analyzeFearGreedTrend(fearGreedData) : null;

    console.log(`✅ Comprehensive parallel fetch completed!`);
    console.log(`📈 Retrieved ${topicScores.length} topic scores, ${sentimentData.size} sentiment datasets, and Fear & Greed analysis`);
    
    return {
      topicScores,
      sentimentData,
      fearGreedAnalysis
    };
  }
} 