import readline from "node:readline";

import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";

import { getOnChainTools } from "@goat-sdk/adapter-vercel-ai";
import { jupiter } from "@goat-sdk/plugin-jupiter";
import { splToken } from "@goat-sdk/plugin-spl-token";
import { sendSOL, solana } from "@goat-sdk/wallet-solana";

import { Connection, Keypair } from "@solana/web3.js";

import base58 from "bs58";

import { Config } from "../libs/config.js";

// 1. Create the wallet client
const connection = new Connection(Config.agent.solana_rpc_url as string);
const keypair = Keypair.fromSecretKey(base58.decode(Config.agent.solana_private_key as string));

async function chat() {
    // 2. Get the onchain tools for the wallet
    const tools = await getOnChainTools({
        wallet: solana({
            keypair,
            connection,
        }),
        plugins: [
            sendSOL(), // Enable SOL transfers
            splToken(), // Enable SPL token operations
            jupiter(),
        ],
    });

    // 3. Create a readline interface to interact with the agent
    type Message = {
        role: "user" | "assistant";
        content: string;
    };

    console.log("Chat started. Type 'exit' to end the conversation.");

    const conversationHistory: Message[] = [];

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    const askQuestion = () => {
        rl.question("You: ", async (prompt) => {
            if (prompt.toLowerCase() === "exit") {
                rl.close();
                return;
            }

            conversationHistory.push({ role: "user", content: prompt });

            const result = await generateText({
                model: openai("gpt-4o-mini"),
                tools: tools,
                maxSteps: 10, // Maximum number of tool invocations per request
                prompt: `You are a based crypto degen assistant. You're knowledgeable about DeFi, NFTs, and trading. You use crypto slang naturally and stay up to date with Solana ecosystem. You help users with their trades and provide market insights. Keep responses concise and use emojis occasionally.

Previous conversation:
${conversationHistory.map((m) => `${m.role}: ${m.content}`).join("\n")}

Current request: ${prompt}`,
                onStepFinish: (event) => {
                    console.log("Tool execution:", event.toolResults);
                },
            });

            conversationHistory.push({
                role: "assistant",
                content: result.text,
            });
            console.log("Assistant:", result.text);
            askQuestion();
        });
    };

    askQuestion();
}

chat().catch(console.error);