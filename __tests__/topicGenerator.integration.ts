import 'dotenv/config';
import { TopicGenerator } from '../src/analysis/topicGenerator.js';

async function main() {
  try {
    console.log('────────────────────────────────────────────');
    console.log('🧪  Integration Test → TopicGenerator');
    console.log('────────────────────────────────────────────');

    const generator = new TopicGenerator();

    // 1. High-priority topics
    const highPriority = generator.getHighPriorityTopics();
    console.log('\n🔥 High-priority topics (always analysed)');
    console.log(highPriority.join(', '));

    // 2. Random selection for analysis (15 total incl. high-priority)
    const currentCycle = generator.getTopicsForCurrentCycle();
    console.log('\n🎯 Topics for current cycle (15 max)');
    console.log(currentCycle.join(', '));

    // 3. Categorised topics
    const categories = generator.getCategorizedTopics();
    console.log('\n📂 Categorised topics (sample counts)');
    Object.entries(categories).forEach(([cat, list]) =>
      console.log(` • ${cat.padEnd(14)} → ${list.length}`)
    );

    // 4. Add some dynamic topics and show how they are merged
    const sampleDynamic = ['superteam', 'shdw', 'clockwork'];
    generator.addDynamicTopics(sampleDynamic);
    console.log('\n➕ Added dynamic topics:', sampleDynamic.join(', '));

    console.log('\n📋 All topics length after dynamic add:', generator.getAllTopics().length);

    // 5. getTopicsForAnalysis (random selection helper)
    const random10 = generator.getTopicsForAnalysis(10);
    console.log('\n🔀 Random 10 topics for analysis:', random10.join(', '));

    // 6. extractTopicsFromHeadlines (invokes agent with fallback if OpenAI key missing)
    const sampleHeadlines = [
      'Solana DeFi platform Jupiter launches new feature',
      'BONK price surges amid memecoin frenzy on Solana',
      'Phantom wallet introduces mobile swap support',
      'Drift protocol raises funding to expand perpetual futures',
      'Stepn users earn SOL while walking',
    ];
    const extracted = await generator.extractTopicsFromHeadlines(sampleHeadlines);
    console.log('\n📰 Extracted topics from sample headlines:', extracted.join(', '));

    // 7. cleanupDynamicTopics – simulate time passing (>6h) then trigger cleanup
    (generator as any).lastTopicUpdate = Date.now() - 7 * 60 * 60 * 1000; // 7 hours ago
    generator.cleanupDynamicTopics();
    console.log('\n🧹 Dynamic topics after cleanup:', (generator as any).dynamicTopics);

    console.log('\n✅ All TopicGenerator functions exercised successfully.');
    console.log('────────────────────────────────────────────');
  } catch (err) {
    console.error('❌ Test failed:', err);
    process.exit(1);
  }
}

main(); 