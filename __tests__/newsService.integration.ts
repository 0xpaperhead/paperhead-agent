import 'dotenv/config';                           // ← loads your .env
import { NewsService } from '../src/analysis/newsService.js';

async function main() {
  try {
    console.log('────────────────────────────────────────────');
    console.log('🧪  Integration Test → NewsService.fetchAllData');
    console.log('────────────────────────────────────────────');

    // Feel free to tweak or extend this topic list
    const topics = ['bitcoin', 'ethereum', 'solana'];

    const service = new NewsService();
    const result = await service.fetchAllData(topics);

    console.log('\n📈 Topic Scores');
    result.topicScores.forEach(({ topic, popularityScore }) =>
      console.log(` • ${topic.padEnd(10)} → ${popularityScore} articles`)
    );

    console.log('\n😃 Sentiment Data');
    result.sentimentData.forEach((data, interval) =>
      console.log(` • Interval ${interval}:`, JSON.stringify(data, null, 2))
    );

    console.log('\n😱 Fear & Greed Analysis');
    console.log(JSON.stringify(result.fearGreedAnalysis, null, 2));

    console.log('\n✅ Test completed without errors.');
    console.log('────────────────────────────────────────────');
  } catch (err) {
    console.error('❌ Test failed:', err);
    process.exit(1);
  }
}

main(); 