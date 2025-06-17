// DEPRECATED

import { Config } from "../libs/config.js";
import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";

import { getOnChainTools } from "@goat-sdk/adapter-vercel-ai";
import { jupiter } from "@goat-sdk/plugin-jupiter";
import { orca } from "@goat-sdk/plugin-orca";
import { solana } from "@goat-sdk/wallet-solana";

import { Connection, Keypair } from "@solana/web3.js";
import base58 from "bs58";

// Simulate API data function
async function getSimulatedApiData(): Promise<string> {
    console.log("🔍 Fetching data from API...\n");
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const apiResponse = "AVO: GdZ9rwHyKcriLdbSzhtEFLe5MLs7Vk6AY1aE5ei7nsmP is a promising AI company";
    
    console.log("📊 API Response:", apiResponse);
    console.log("✅ Data received successfully!\n");
    
    return apiResponse;
}

// Main simulation function
export async function runSimulation() {
    try {
        console.log("🚀 Starting Paperhead Agent Simulation...\n");
        
        // 1. Create the wallet client
        const connection = new Connection(Config.agent.solana_rpc_url);
        const keypair = Keypair.fromSecretKey(base58.decode(Config.agent.solana_private_key));
        
        // 2. Get the onchain tools for the wallet
        console.log("🔧 Setting up blockchain tools...");
        const tools = await getOnChainTools({
            wallet: solana({
                keypair,
                connection,
            }),
            plugins: [
                jupiter(),
                orca()
            ],
        });
        console.log("✅ Tools initialized!\n");
        
        // 3. Simulate getting API data
        const apiData = await getSimulatedApiData();
        
        // 4. Create the trading prompt
        const tradingPrompt = `${apiData}

Based on this information about AVO token, I want you to:
1. First check my current SOL balance
2. Calculate 10% of my SOL balance 
3. Make a trade decision to buy AVO tokens with that 10% amount
4. Execute the trade if it looks good

Please be careful with the trade and explain your reasoning step by step.`;

        console.log("🤖 Sending request to AI agent...\n");
        console.log("📝 Prompt:", tradingPrompt);
        console.log("\n" + "=".repeat(50) + "\n");

        // 5. Generate response with tools
        const result = await generateText({
            model: openai("gpt-4o-mini"),
            tools: tools,
            maxSteps: 10, // Maximum number of tool invocations per request
            prompt: `You are a based crypto degen assistant. You're knowledgeable about DeFi, NFTs, and trading. You use crypto slang naturally and stay up to date with Solana ecosystem. You help users with their trades and provide market insights. Keep responses concise and use emojis occasionally.

Current request: ${tradingPrompt}`,
            onStepFinish: (event) => {
                console.log("🔧 Tool execution:", JSON.stringify(event.toolResults, null, 2));
                console.log("-".repeat(30));
            },
        });

        console.log("\n" + "=".repeat(50));
        console.log("🎯 Final Response:");
        console.log("Assistant:", result.text);
        console.log("\n✅ Simulation completed successfully!");
        
    } catch (error) {
        console.error("❌ Simulation failed:", error);
        process.exit(1);
    }
}

// Run simulation if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runSimulation().catch(console.error);
}