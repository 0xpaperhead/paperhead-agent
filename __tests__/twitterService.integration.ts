import 'dotenv/config';
import { TwitterService } from '../src/analysis/twitterService.js';

async function main() {
  try {
    console.log('────────────────────────────────────────────');
    console.log('🧪  Integration Test → TwitterService');
    console.log('────────────────────────────────────────────');

    const service = new TwitterService();

    // Choose a small set of Solana-focused accounts (override by passing CLI args after --)
    const cliArgs = process.argv.slice(2);
    const usernames = cliArgs.length > 0
      ? cliArgs
      : ['solana', 'jupiter_exchange', 'orca_so', 'raydiumprotocol'];

    const tweetsPerUser = 10; // keep API usage low

    console.log(`\n📋 Analyzing ${usernames.length} users (${tweetsPerUser} tweets per user)...`);

    const analysis = await service.analyzeTwitterData(usernames, tweetsPerUser);

    // Print token mentions summary
    console.log('\n🪙 Token Mentions (top 10 by count)');
    analysis.tokenMentions.slice(0, 10).forEach(tm => {
      console.log(` • ${tm.token.padEnd(6)} → ${tm.mentionCount} mentions, sentiment ${tm.sentiment}`);
    });

    // Print mindshare high-level stats
    const mind = analysis.mindshareAnalysis;
    console.log('\n🧠 Mindshare Analysis');
    console.log(` • Total tweets analyzed      : ${mind.totalTweets}`);
    console.log(` • Total engagement (likes etc): ${mind.totalEngagement}`);
    console.log(` • Avg engagement per tweet    : ${mind.averageEngagement.toFixed(2)}`);
    console.log(` • Sentiment distribution      : +${mind.sentimentDistribution.positive} / ~${mind.sentimentDistribution.neutral} / -${mind.sentimentDistribution.negative}`);

    // Print top influencers
    console.log('\n🌟 Top Influencers');
    mind.topInfluencers.forEach((inf, idx) => {
      console.log(` ${idx + 1}. @${inf.username.padEnd(20)} – ${inf.followerCount} followers, ${inf.avgEngagement.toFixed(1)} avg engagement`);
    });

    // Print topics summary
    console.log('\n#️⃣ Topics (up to 10)');
    analysis.topics.slice(0, 10).forEach(t => {
      console.log(` • ${t.topic.padEnd(15)} → score ${t.relevanceScore}, sentiment ${t.sentiment}`);
    });

    console.log('\n✅ TwitterService integration test completed.');
    console.log('────────────────────────────────────────────');
  } catch (err) {
    console.error('❌ Test failed:', err);
    process.exit(1);
  }
}

main(); 