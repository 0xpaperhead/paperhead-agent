/* eslint-disable no-console */
import 'dotenv/config'
import { AgenticSystem } from './agent/agenticSystem.js';

console.log('Application Environment:', process.env.NODE_ENV + '\n\n');
console.log('🎭 Starting Paperhead Agentic Trading System...');
console.log('💰 24-Hour Automatic Portfolio Rebalancing System');
console.log('🎯 10-Token Diversified Portfolio Strategy');
console.log('🔄 Intelligent Buy/Sell Based on Market Analysis\n');

// Initialize and start the agentic system
async function startAgenticSystem() {
    try {
        const agenticSystem = new AgenticSystem();
        
        // Initialize the system
        await agenticSystem.initialize();
        
        // Start the indefinite loop
        await agenticSystem.start();
        
        // Handle graceful shutdown
        process.on('SIGINT', () => {
            console.log('\n🛑 Received SIGINT, shutting down gracefully...');
            agenticSystem.stop();
            process.exit(0);
        });
        
        process.on('SIGTERM', () => {
            console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
            agenticSystem.stop();
            process.exit(0);
        });
        
    } catch (error) {
        console.error('❌ Failed to start agentic system:', error);
        process.exit(1);
    }
}

startAgenticSystem().catch(console.error);