import "dotenv/config";
import { Agent } from "./core/Agent.js";
import { getRiskProfileInfo } from "./config/trading.js";

// Initialize and start the agentic system
async function startAgent() {
  try {
    console.log("🎭".repeat(20));
    console.log("🎭 Starting Paperhead Agentic Trading System...");
    console.log("💰 Automatic Portfolio Rebalancing System");
    console.log("🎯 Multi-Token Diversified Portfolio Strategy");
    console.log("🔄 Intelligent Buy/Sell Based on Market Analysis");
    console.log("🎭".repeat(20));

    console.log("\n⚙️ SYSTEM STARTUP DIAGNOSTICS");
    console.log("─".repeat(50));
    console.log(`🌐 Node.js Version: ${process.version}`);
    console.log(`📅 Startup Time: ${new Date().toLocaleString()}`);
    console.log(`💾 Memory Usage: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`);

    // Environment checks
    const requiredEnvVars = [
      "OPENAI_API_KEY",
      "RAPID_API_KEY",
      "SOLANA_TRACKER_API_KEY",
      "SOLANA_RPC_URL",
      "SOLANA_PRIVATE_KEY",
    ];

    console.log("\n🔐 ENVIRONMENT VALIDATION:");
    requiredEnvVars.forEach(envVar => {
      const isSet = !!process.env[envVar];
      console.log(`   ${isSet ? "✅" : "❌"} ${envVar}: ${isSet ? "Configured" : "Missing"}`);
    });

    const missingVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
    if (missingVars.length > 0) {
      console.log(`\n🚨 Missing required environment variables: ${missingVars.join(", ")}`);
      console.log("Please check your .env file and ensure all required variables are set.");
      process.exit(1);
    }

    // Create agent with risk profile from config (can be overridden by passing parameter)
    const agent = new Agent();

    // Initialize the system
    await agent.initialize();

    // Get the actual intervals based on risk profile from trading config
    const riskProfile = agent.getDefaultRiskProfile();
    const profileInfo = getRiskProfileInfo(riskProfile);
    const currentProfileData = profileInfo.profiles[riskProfile];
    const updateHours = currentProfileData.hours;

    const getProfileDescription = (profile: string): string => {
      const profileData = profileInfo.profiles[profile];
      return profileData
        ? `${profile.charAt(0).toUpperCase() + profile.slice(1)} (${profileData.frequency.toLowerCase()}, max ${
            profileData.maxDailyLoss
          }% daily loss)`
        : "Unknown profile";
    };

    console.log("\n🚀 SYSTEM READY FOR OPERATION");
    console.log("─".repeat(50));
    console.log("💡 The system is now monitoring markets and will:");
    console.log("   📊 Analyze market sentiment every hour");
    console.log(`   🔄 Rebalance portfolio every ${updateHours} hours`);
    console.log("   📈 Execute trades based on AI analysis");
    console.log(`   ⚠️ Risk Management: ${getProfileDescription(riskProfile)}`);
    console.log("─".repeat(50));

    // Start the indefinite loop
    agent.start();
  } catch (error) {
    console.error("\n🚨 SYSTEM STARTUP FAILED:");
    console.error("─".repeat(50));
    console.error(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);

    if (error instanceof Error && error.stack) {
      console.error("\n📋 Stack Trace:");
      console.error(error.stack);
    }

    console.error("\n💡 Troubleshooting Tips:");
    console.error("   1. Verify your API keys are valid and have sufficient credits");
    console.error("   2. Ensure your Solana wallet has sufficient SOL balance");
    console.error("   3. Check your internet connection");
    console.error("─".repeat(50));

    process.exit(1);
  }
}

startAgent().catch(console.error);
